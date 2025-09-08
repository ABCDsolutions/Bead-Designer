"use client"

import type React from "react"
import { useDesignStore } from "@/lib/store"
import type { Cell as BeadCellType } from "@/types/design"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"

interface BeadCellProps {
  strandId: string
  index: number
  cell?: BeadCellType
  size: number
  showPosition?: boolean
}

export function BeadCell({ strandId, index, cell, size, showPosition }: BeadCellProps) {
  // Seleccionar solo las partes del store necesarias para minimizar re-render
  const palette = useDesignStore(state => state.palette)
  const setCell = useDesignStore(state => state.setCell)
  const selectedBeadId = useDesignStore(state => state.selectedBeadId)
  const { symmetry, strandLen } = useDesignStore(
    (state) => ({
      symmetry: state.design.symmetry,
      strandLen: state.design.strands.find((s) => s.id === strandId)?.cells.length || 0,
    })
  )
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  // Asegurarse de que cell está definido (TypeScript seguridad)
  const safeCell = cell || { beadId: null };
  const bead = safeCell.beadId ? palette[safeCell.beadId] : null
  const cellSize = Math.max(size * 4, 24)

  // Función simplificada para aplicar color
  const applyColor = useCallback((colorToApply: string | null) => {
    // Quiet logging for performance
    setCell(strandId, index, colorToApply);
  }, [setCell, strandId, index]);
  
  // Determinamos el color a aplicar basado en la selección
  const getColorToApply = useCallback(() => {
    if (selectedBeadId) {
      return safeCell.beadId === selectedBeadId ? null : selectedBeadId;
    } else {
      return safeCell.beadId ? null : "red";
    }
  }, [selectedBeadId, safeCell.beadId]);

  // Handlers simplificados
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      applyColor(getColorToApply());
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    
    if (!isDragging) return;
    
    // En modo arrastre aplicamos una lógica diferente
    if (selectedBeadId) {
      // Con color seleccionado, siempre aplicamos ese color
      applyColor(selectedBeadId);
    } else if (!safeCell.beadId) {
      // Sin selección pero celda vacía, aplicamos rojo
      applyColor("red");
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Gestión global de eventos de mouse para manejar casos extremos
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleMouseLeave = (e: MouseEvent) => {
      const from = e.relatedTarget as Node;
      if (!from || from.nodeName === 'HTML') setIsDragging(false);
    };
    const handleBlur = () => setIsDragging(false);

    window.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isDragging]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Right click siempre limpia la celda
    applyColor(null);
  };

  // Check if this cell should be highlighted due to symmetry
  const isSymmetryHighlight = () => {
    if (symmetry === "none") return false
    if (symmetry === "mirror-center") {
      const mirrorIndex = strandLen - 1 - index
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
        onContextMenu={handleContextMenu}
        // No usamos onClick para evitar problemas de sincronización
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
