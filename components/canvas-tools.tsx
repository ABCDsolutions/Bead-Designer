"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useDesignStore } from "@/lib/store"
import {
  Paintbrush,
  Eraser,
  Droplet as Eyedropper,
  Copy,
  Scissors,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Shuffle,
} from "lucide-react"

type Tool = "paint" | "erase" | "eyedropper" | "select" | "fill"

export function CanvasTools() {
  const [activeTool, setActiveTool] = useState<Tool>("paint")
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null)
  const { design, palette } = useDesignStore()

  const tools = [
    { id: "paint" as Tool, icon: Paintbrush, label: "Paint", shortcut: "P" },
    { id: "erase" as Tool, icon: Eraser, label: "Erase", shortcut: "E" },
    { id: "eyedropper" as Tool, icon: Eyedropper, label: "Eyedropper", shortcut: "I" },
    { id: "select" as Tool, icon: Copy, label: "Select", shortcut: "S" },
  ]

  const patterns = [
    { id: "alternating", name: "Alternating", pattern: "ABAB" },
    { id: "double", name: "Double Alt", pattern: "AABB" },
    { id: "gradient", name: "Gradient", pattern: "GRADIENT" },
    { id: "sequence", name: "Sequence", pattern: "A3B2C1" },
    { id: "random", name: "Random", pattern: "RANDOM" },
    { id: "wave", name: "Wave", pattern: "WAVE" },
  ]

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-medium mb-3">Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? "default" : "outline"}
              size="sm"
              className="justify-start"
              onClick={() => setActiveTool(tool.id)}
            >
              <tool.icon className="h-4 w-4 mr-2" />
              {tool.label}
              <Badge variant="secondary" className="ml-auto text-xs">
                {tool.shortcut}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-3">Quick Patterns</h3>
        <div className="space-y-2">
          {patterns.map((pattern) => (
            <Button
              key={pattern.id}
              variant="outline"
              size="sm"
              className="w-full justify-between bg-transparent"
              onClick={() => {
                const firstStrand = design.strands[0]
                if (firstStrand) {
                  const { applyPattern } = useDesignStore.getState()
                  applyPattern(firstStrand.id, [0, firstStrand.cells.length - 1], pattern.pattern)
                }
              }}
            >
              <span>{pattern.name}</span>
              <Badge variant="secondary" className="text-xs">
                {pattern.pattern}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-3">Transform</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">
            <RotateCw className="h-4 w-4 mr-2" />
            Rotate
          </Button>
          <Button variant="outline" size="sm">
            <FlipHorizontal className="h-4 w-4 mr-2" />
            Flip H
          </Button>
          <Button variant="outline" size="sm">
            <FlipVertical className="h-4 w-4 mr-2" />
            Flip V
          </Button>
          <Button variant="outline" size="sm">
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
        </div>
      </div>

      {selectedRange && (
        <>
          <Separator />
          <div>
            <h3 className="font-medium mb-2">Selection</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Positions {selectedRange[0]} - {selectedRange[1]}
            </p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                <Scissors className="h-4 w-4 mr-2" />
                Cut
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
