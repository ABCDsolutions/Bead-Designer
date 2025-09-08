"use client"

import { useDesignStore } from "@/lib/store"
import { BeadCell, FirstLineBeadCell } from "./bead-cell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, RotateCcw, ZoomIn, ZoomOut, Grid, Ruler, Music } from "lucide-react"
import { useState, useRef } from "react"

export function BeadCanvas() {
  const { design, addStrand, removeStrand, updateStrandLength, updateStrandDiameter } = useDesignStore()
  const [zoom, setZoom] = useState(100)
  const [showGrid, setShowGrid] = useState(true)
  const [showRuler, setShowRuler] = useState(true)
  const [canvasMode, setCanvasMode] = useState<"staff" | "grid">("staff")
  const [staffLines, setStaffLines] = useState(5)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Calculate total beads needed based on length and diameter
  const calculateBeadCount = (lengthCm: number, diameterMm: number) => {
    return Math.ceil((lengthCm * 10) / diameterMm)
  }

  const calculateBeadsPerLine = (totalBeads: number, lines: number) => {
    return Math.ceil(totalBeads / lines)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Canvas Controls */}
      <div className="border-b bg-card px-2 sm:px-4 py-2 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm font-medium">Mode:</span>
            <Select value={canvasMode} onValueChange={(value: "staff" | "grid") => setCanvasMode(value)}>
              <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Staff
                  </div>
                </SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canvasMode === "staff" && (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium">Lines:</span>
              <Select
                key={`staff-lines-${staffLines}`}
                value={staffLines.toString()}
                onValueChange={(value) => {
                  const newLines = Number.parseInt(value)
                  console.log("[v0] Changing staff lines from", staffLines, "to", newLines)
                  setStaffLines(newLines)
                }}
              >
                <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant={showGrid ? "default" : "outline"} size="sm" className="h-8 sm:h-9 w-8 sm:w-9 p-0" onClick={() => setShowGrid(!showGrid)}>
              <Grid className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button variant={showRuler ? "default" : "outline"} size="sm" className="h-8 sm:h-9 w-8 sm:w-9 p-0" onClick={() => setShowRuler(!showRuler)}>
              <Ruler className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="sm" className="h-8 sm:h-9 w-8 sm:w-9 p-0" onClick={() => setZoom(Math.max(50, zoom - 25))} disabled={zoom <= 50}>
              <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-center">{zoom}%</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 w-8 sm:w-9 p-0"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="h-8 sm:h-9 w-8 sm:w-9 p-0" onClick={() => setZoom(100)}>
            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-4 overflow-auto bg-muted/20">
        <div
          ref={canvasRef}
          className="max-w-6xl mx-auto space-y-6"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
        >
          {/* Ruler */}
          {showRuler && (
            <div className="flex justify-center mb-4">
              <div className="flex items-center bg-card border rounded-lg px-4 py-2">
                <div className="flex items-center space-x-8">
                  {Array.from({ length: 21 }, (_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className={`w-px bg-border ${i % 5 === 0 ? "h-4" : "h-2"}`} />
                      {i % 5 === 0 && <span className="text-xs text-muted-foreground mt-1">{i}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Strands */}
          {design.strands.map((strand, strandIndex) => {
            const calculatedBeadCount = calculateBeadCount(strand.lengthCm, strand.diameterMm)
            const needsResize = strand.cells.length !== calculatedBeadCount
            const beadsPerLine = calculateBeadsPerLine(calculatedBeadCount, staffLines)

            console.log(
              "[v0] Strand",
              strandIndex,
              "- Staff lines:",
              staffLines,
              "Beads per line:",
              beadsPerLine,
              "Total beads:",
              calculatedBeadCount,
            )

            return (
              <Card key={strand.id} className="p-3 sm:p-6 relative">
                {/* Strand Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                    <h3 className="font-semibold text-base sm:text-lg">{strand.name}</h3>
                    <Badge variant="secondary" className="text-xs sm:text-sm">{strand.lengthCm}cm</Badge>
                    <Badge variant="outline" className="text-xs sm:text-sm">{strand.diameterMm}mm beads</Badge>
                    {needsResize && <Badge variant="destructive" className="text-xs sm:text-sm">Needs {calculatedBeadCount} beads</Badge>}
                    {canvasMode === "staff" && (
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {staffLines} lines × {beadsPerLine} beads
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {strand.cells.filter((cell) => cell.beadId).length} / {strand.cells.length} filled
                    </span>
                    {design.strands.length > 1 && (
                      <Button variant="outline" size="sm" className="h-7 sm:h-9 w-7 sm:w-9 p-0" onClick={() => removeStrand(strand.id)}>
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {canvasMode === "staff" ? (
                  <div className="space-y-4">
                    {/* Staff Lines with Beads */}
                    {Array.from({ length: staffLines }, (_, lineIndex) => {
                      const startIndex = lineIndex * beadsPerLine
                      const endIndex = Math.min(startIndex + beadsPerLine, strand.cells.length)
                      const lineCells = strand.cells.slice(startIndex, endIndex)

                      return (
                        <div key={`${strand.id}-line-${lineIndex}`} className="relative">
                          {/* Staff Line */}
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-border transform -translate-y-1/2 z-0" />

                          {/* Position Numbers */}
                          {showRuler && (
                            <div className="flex justify-start mb-1 ml-8">
                              {lineCells.map((_, cellIndex) => {
                                const globalIndex = startIndex + cellIndex
                                return (
                                  <div
                                    key={cellIndex}
                                    className="flex justify-center text-xs text-muted-foreground"
                                    style={{ width: Math.max(strand.diameterMm * 4, 32) }}
                                  >
                                    {globalIndex % 5 === 0 && globalIndex}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Beads on Staff Line */}
                          <div className="flex items-center gap-1 relative z-10 ml-8">
                            {/* Line Number */}
                            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mr-2 font-medium">
                              {lineIndex + 1}
                            </div>

                            {/* Beads */}
                            {lineCells.map((cell, cellIndex) => {
                              const globalIndex = startIndex + cellIndex
                              
                              // Usamos el componente especial para la primera línea (lineIndex === 0)
                              // que maneja sus propios datos sin depender de props y resuelve el problema
                              // de desaparición de cuentas en la primera línea
                              if (lineIndex === 0) {
                                console.log(`[Canvas] Renderizando FirstLineBeadCell para strand=${strand.id}, index=${globalIndex}`);
                                return (
                                  <FirstLineBeadCell
                                    key={`special-${strand.id}-${globalIndex}`}
                                    strandId={strand.id}
                                    index={globalIndex}
                                    size={strand.diameterMm}
                                  />
                                );
                              }
                              
                              // Para el resto de líneas, usamos el componente normal
                              return (
                                <BeadCell
                                  key={`${strand.id}-${globalIndex}`}
                                  strandId={strand.id}
                                  index={globalIndex}
                                  cell={cell}
                                  size={strand.diameterMm}
                                  showPosition={false}
                                />
                              )
                            })}

                            {/* Fill remaining positions if needed */}
                            {lineCells.length < beadsPerLine &&
                              Array.from({ length: beadsPerLine - lineCells.length }, (_, emptyIndex) => {
                                const emptyGlobalIndex = startIndex + lineCells.length + emptyIndex
                                return (
                                  <div
                                    key={`${strand.id}-empty-${emptyGlobalIndex}`}
                                    className="border-2 border-dashed border-muted-foreground/30 rounded-full bg-muted/20"
                                    style={{
                                      width: Math.max(strand.diameterMm * 4, 32),
                                      height: Math.max(strand.diameterMm * 4, 32),
                                    }}
                                  />
                                )
                              })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  // Original grid layout
                  <>
                    {/* Position Indicators */}
                    {showRuler && (
                      <div className="flex justify-center mb-2">
                        <div className="flex">
                          {strand.cells.map((_, index) => (
                            <div
                              key={index}
                              className="flex flex-col items-center"
                              style={{ width: Math.max(strand.diameterMm * 4, 24) }}
                            >
                              {index % 5 === 0 && <span className="text-xs text-muted-foreground mb-1">{index}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bead Grid */}
                    <div className="flex justify-center">
                      <div className={`flex flex-wrap gap-1 justify-center ${showGrid ? "grid-overlay" : ""}`}>
                        {strand.cells.map((cell, index) => (
                          <BeadCell
                            key={`${strand.id}-${index}`}
                            strandId={strand.id}
                            index={index}
                            cell={cell}
                            size={strand.diameterMm}
                            showPosition={showRuler}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Strand Controls */}
                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm">Length:</span>
                      <Slider
                        value={[strand.lengthCm]}
                        onValueChange={([value]) => {
                          console.log("[v0] Updating strand length to:", value)
                          updateStrandLength?.(strand.id, value)
                        }}
                        max={50}
                        min={5}
                        step={0.5}
                        className="w-20 sm:w-24"
                      />
                      <span className="text-xs sm:text-sm w-10 sm:w-12">{strand.lengthCm}cm</span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm">Bead Size:</span>
                      <Select
                        value={strand.diameterMm.toString()}
                        onValueChange={(value) => {
                          const newDiameter = Number.parseInt(value)
                          console.log("[v0] Updating strand diameter to:", newDiameter)
                          updateStrandDiameter?.(strand.id, newDiameter)
                        }}
                      >
                        <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4mm</SelectItem>
                          <SelectItem value="6">6mm</SelectItem>
                          <SelectItem value="8">8mm</SelectItem>
                          <SelectItem value="10">10mm</SelectItem>
                          <SelectItem value="12">12mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 sm:h-9 text-xs sm:text-sm">
                      Clear Strand
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 sm:h-9 text-xs sm:text-sm">
                      Fill Pattern
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}

          {/* Add Strand Button */}
          <Card className="p-3 sm:p-6 border-dashed">
            <Button variant="outline" className="w-full bg-transparent h-8 sm:h-10" onClick={addStrand}>
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Add New Strand</span>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
