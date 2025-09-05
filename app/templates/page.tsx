"use client"

import { useState } from "react"
import { useDesignStore } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Clock, Palette, Zap, Grid, Waves, Triangle } from "lucide-react"
import type { PatternTemplate, Pattern } from "@/types/design"

const patternTemplates: PatternTemplate[] = [
  {
    id: "basic-alternating",
    name: "Basic Alternating",
    description: "Simple two-color alternating patterns perfect for beginners",
    category: "Basic",
    tags: ["beginner", "two-color", "simple"],
    difficulty: "beginner",
    estimatedTime: "15 min",
    materials: ["2 bead colors", "string"],
    thumbnail: "/alternating-bead-pattern.png",
    patterns: [
      {
        id: "abab",
        name: "ABAB",
        description: "Classic alternating pattern",
        category: "basic",
        sequence: "ABAB",
        preview: ["A", "B", "A", "B", "A", "B"],
        minColors: 2,
        maxColors: 2,
        difficulty: "easy",
      },
      {
        id: "aabb",
        name: "AABB",
        description: "Double alternating pattern",
        category: "basic",
        sequence: "AABB",
        preview: ["A", "A", "B", "B", "A", "A"],
        minColors: 2,
        maxColors: 2,
        difficulty: "easy",
      },
    ],
  },
  {
    id: "geometric-patterns",
    name: "Geometric Patterns",
    description: "Bold geometric designs with repeating shapes",
    category: "Geometric",
    tags: ["geometric", "modern", "structured"],
    difficulty: "intermediate",
    estimatedTime: "30 min",
    materials: ["3-4 bead colors", "string"],
    thumbnail: "/geometric-bead-pattern-chevron.png",
    patterns: [
      {
        id: "chevron",
        name: "Chevron",
        description: "V-shaped zigzag pattern",
        category: "geometric",
        sequence: "A3B1C3B1",
        preview: ["A", "A", "A", "B", "C", "C", "C", "B"],
        minColors: 3,
        maxColors: 3,
        difficulty: "medium",
      },
      {
        id: "diamond",
        name: "Diamond",
        description: "Diamond-shaped repeating pattern",
        category: "geometric",
        sequence: "A1B2C1B2",
        preview: ["A", "B", "B", "C", "B", "B"],
        minColors: 3,
        maxColors: 3,
        difficulty: "medium",
      },
    ],
  },
  {
    id: "gradient-flows",
    name: "Gradient Flows",
    description: "Smooth color transitions and flowing patterns",
    category: "Gradient",
    tags: ["gradient", "smooth", "flowing"],
    difficulty: "intermediate",
    estimatedTime: "25 min",
    materials: ["4-6 bead colors", "string"],
    thumbnail: "/gradient-bead-pattern-flowing-colors.png",
    patterns: [
      {
        id: "linear-gradient",
        name: "Linear Gradient",
        description: "Smooth transition between colors",
        category: "gradient",
        sequence: "GRADIENT",
        preview: ["A", "A", "B", "B", "C", "C"],
        minColors: 2,
        maxColors: 6,
        difficulty: "medium",
      },
      {
        id: "wave-gradient",
        name: "Wave Gradient",
        description: "Flowing wave-like color transitions",
        category: "gradient",
        sequence: "WAVE",
        preview: ["A", "B", "C", "B", "A", "B"],
        minColors: 3,
        maxColors: 5,
        difficulty: "medium",
      },
    ],
  },
  {
    id: "complex-designs",
    name: "Complex Designs",
    description: "Intricate patterns for advanced crafters",
    category: "Complex",
    tags: ["advanced", "intricate", "detailed"],
    difficulty: "advanced",
    estimatedTime: "45 min",
    materials: ["5+ bead colors", "string", "patience"],
    thumbnail: "/complex-bead-pattern-mandala.png",
    patterns: [
      {
        id: "mandala",
        name: "Mandala",
        description: "Circular mandala-inspired pattern",
        category: "complex",
        sequence: "A1B2C3D2C1B2A1",
        preview: ["A", "B", "B", "C", "C", "C", "D", "D"],
        minColors: 4,
        maxColors: 6,
        difficulty: "hard",
      },
      {
        id: "tribal",
        name: "Tribal",
        description: "Traditional tribal-inspired design",
        category: "complex",
        sequence: "A2B1A1C2A1B2",
        preview: ["A", "A", "B", "A", "C", "C"],
        minColors: 3,
        maxColors: 5,
        difficulty: "hard",
      },
    ],
  },
]

export default function TemplatesPage() {
  const { applyPattern, design, palette } = useDesignStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState<PatternTemplate | null>(null)

  const filteredTemplates = patternTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory =
      selectedCategory === "all" || template.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesDifficulty = selectedDifficulty === "all" || template.difficulty === selectedDifficulty

    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const applyTemplatePattern = (pattern: Pattern, strandId?: string) => {
    const targetStrand = strandId || design.strands[0]?.id
    if (!targetStrand) return

    const strand = design.strands.find((s) => s.id === targetStrand)
    if (!strand) return

    const range: [number, number] = [0, strand.cells.length - 1]
    applyPattern(targetStrand, range, pattern.sequence)
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "basic":
        return <Zap className="h-4 w-4" />
      case "geometric":
        return <Grid className="h-4 w-4" />
      case "gradient":
        return <Waves className="h-4 w-4" />
      case "complex":
        return <Triangle className="h-4 w-4" />
      default:
        return <Palette className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pattern Templates</h1>
          <p className="text-muted-foreground">Discover and apply beautiful bead patterns to your designs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patterns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="geometric">Geometric</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="complex">Complex</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-muted relative">
              <img
                src={template.thumbnail || "/placeholder.svg"}
                alt={template.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge className={getDifficultyColor(template.difficulty)}>{template.difficulty}</Badge>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
                {getCategoryIcon(template.category)}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{template.estimatedTime}</span>
                <span>•</span>
                <span>{template.patterns.length} patterns</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      View Patterns
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{template.name}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <p className="text-muted-foreground">{template.description}</p>

                      <div className="grid gap-4">
                        {template.patterns.map((pattern) => (
                          <Card key={pattern.id} className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{pattern.name}</h4>
                                <p className="text-sm text-muted-foreground">{pattern.description}</p>
                              </div>
                              <Badge variant="outline">{pattern.difficulty}</Badge>
                            </div>

                            {/* Pattern Preview */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-medium">Preview:</span>
                              <div className="flex gap-1">
                                {pattern.preview.map((bead, index) => (
                                  <div
                                    key={index}
                                    className="w-6 h-6 rounded-full border border-border"
                                    style={{
                                      backgroundColor:
                                        bead === "A"
                                          ? "#ef4444"
                                          : bead === "B"
                                            ? "#3b82f6"
                                            : bead === "C"
                                              ? "#22c55e"
                                              : bead === "D"
                                                ? "#eab308"
                                                : "#6b7280",
                                    }}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <div className="text-sm text-muted-foreground">
                                Colors needed: {pattern.minColors}
                                {pattern.maxColors && pattern.maxColors !== pattern.minColors
                                  ? `-${pattern.maxColors}`
                                  : ""}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => applyTemplatePattern(pattern)}
                                disabled={Object.keys(palette).length < pattern.minColors}
                              >
                                Apply Pattern
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  className="flex-1"
                  onClick={() => applyTemplatePattern(template.patterns[0])}
                  disabled={Object.keys(palette).length < template.patterns[0].minColors}
                >
                  Quick Apply
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No templates found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  )
}
