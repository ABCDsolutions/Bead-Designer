"use client"

import type React from "react"

import { useDesignStore } from "@/lib/store"
import type { BeadCell as BeadCellType } from "@/types/design"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface BeadCellProps {
  strandId: string
  index: number
  cell: BeadCellType
  size: number
  showPosition?: boolean
}

export function BeadCell({ strandId, index, cell, size, showPosition }: BeadCellProps) {
  const { palette, setCell, design } = useDesignStore()
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const bead = cell.beadId ? palette[cell.beadId] : null
  const cellSize = Math.max(size * 4, 24)

  const handleClick = () => {
    const colors = ["red", "blue", "green", "yellow", "purple", "white", "black"]
    const currentIndex = cell.beadId ? colors.indexOf(cell.beadId) : -1
    const nextIndex = (currentIndex + 1) % (colors.length + 1)
    const nextBeadId = nextIndex === colors.length ? null : colors[nextIndex]

    setCell(strandId, index, nextBeadId)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left click
      setIsDragging(true)
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (isDragging) {
      // Paint while dragging
      handleClick()
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    // Right click to clear
    setCell(strandId, index, null)
  }

  // Check if this cell should be highlighted due to symmetry
  const isSymmetryHighlight = () => {
    if (design.symmetry === "none") return false

    const strand = design.strands.find((s) => s.id === strandId)
    if (!strand) return false

    if (design.symmetry === "mirror-center") {
      const mirrorIndex = strand.cells.length - 1 - index
      return mirrorIndex !== index
    }

    return false
  }

  return (
    <div className="relative">
      {showPosition && index % 5 === 0 && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <span className="text-xs text-muted-foreground">{index}</span>
        </div>
      )}

      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "rounded-full border-2 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "relative overflow-hidden",
          !bead && "bg-muted hover:bg-muted/80 border-border",
          bead && "border-border hover:border-primary",
          isHovered && "scale-110 shadow-lg",
          isDragging && "scale-95",
          isSymmetryHighlight() && "ring-2 ring-accent ring-opacity-50",
        )}
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: bead?.hex || undefined,
        }}
        title={bead ? `${bead.name} (${bead.mm}mm) - Position ${index}` : `Empty - Position ${index}`}
      >
        {/* Bead shape indicator */}
        {bead && bead.shape !== "round" && (
          <div className="absolute inset-0 flex items-center justify-center">
            {bead.shape === "cube" && <div className="w-3 h-3 border border-white/30 rounded-sm" />}
            {bead.shape === "cylinder" && <div className="w-1 h-4 bg-white/30 rounded-full" />}
            {bead.shape === "spacer" && <div className="w-2 h-2 border border-white/50 rounded-full" />}
            {bead.shape === "charm" && (
              <div className="w-3 h-3 bg-white/30 rounded-full relative">
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
              </div>
            )}
          </div>
        )}

        {/* Selection highlight */}
        {isHovered && <div className="absolute inset-0 bg-white/20 rounded-full" />}
      </button>
    </div>
  )
}
