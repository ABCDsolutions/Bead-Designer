"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, Upload, Share2, Palette, Grid3X3, Wrench, Save, RotateCcw, Undo2, Redo2 } from "lucide-react"
import Link from "next/link"
import { ImportDialog } from "@/components/import-dialog"
import { useDesignStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

interface Bead {
  id: string
  color: string
  name: string
  shape: "round" | "oval" | "square" | "star" | "tube" | "tube-horizontal" | "triangle" | "diamond"
}

interface StaffLine {
  id: number
  beads: (Bead | null)[]
}

const BEAD_COLORS = [
  { color: "#ef4444", name: "Rojo" },
  { color: "#3b82f6", name: "Azul" },
  { color: "#22c55e", name: "Verde" },
  { color: "#f59e0b", name: "Amarillo" },
  { color: "#8b5cf6", name: "Morado" },
  { color: "#ec4899", name: "Rosa" },
  { color: "#06b6d4", name: "Cian" },
  { color: "#84cc16", name: "Lima" },
  { color: "#f97316", name: "Naranja" },
  { color: "#6b7280", name: "Gris" },
]

export default function BeadDesigner() {
  const [staffLines, setStaffLines] = useState<StaffLine[]>([
    { id: 1, beads: Array(20).fill(null) },
    { id: 2, beads: Array(20).fill(null) },
    { id: 3, beads: Array(20).fill(null) },
    { id: 4, beads: Array(20).fill(null) },
    { id: 5, beads: Array(20).fill(null) },
  ])

  const [selectedColor, setSelectedColor] = useState(BEAD_COLORS[0])
  const [selectedShape, setSelectedShape] = useState<"round" | "oval" | "square" | "star" | "tube" | "tube-horizontal" | "triangle" | "diamond">("round")
  const [beadsPerLine, setBeadsPerLine] = useState(20)
  const [customColors, setCustomColors] = useState<string[]>([])
  // Mantiene colores personalizados eliminados para no re-importarlos automáticamente
  const [deletedCustomColors, setDeletedCustomColors] = useState<string[]>([])
  const [hasRestoredDesign, setHasRestoredDesign] = useState(false)
  const [showPositions, setShowPositions] = useState(true)
  
  const { toast } = useToast()
  
  // Obtener el diseño actual y la paleta del store
  const design = useDesignStore(state => state.design)
  const palette = useDesignStore(state => state.palette)
  const undo = useDesignStore(state => state.undo)
  const redo = useDesignStore(state => state.redo)
  const canUndo = useDesignStore(state => state.history.length > 0)
  const canRedo = useDesignStore(state => state.future.length > 0)

  // Atajos de teclado: Undo/Redo (Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y) y toggle posiciones (R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if ((mod && e.shiftKey && key === 'z') || (mod && key === 'y')) {
        e.preventDefault()
        redo()
        return
      }
      if (key === 'r') {
        e.preventDefault()
        setShowPositions(prev => !prev)
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])
  
  // Crear la ref para controlar si este es el montaje inicial
  const isInitialMount = useRef(true);
  
  // Ya no necesitamos la sincronización inicial automática
  // porque podría sobrescribir el diseño cargado desde localStorage
  // Ahora sincronizaremos explícitamente solo cuando el usuario haga cambios

  // Escuchar cambios en el diseño importado y actualizar el estado local
  // Ahora reaccionamos tanto a la carga inicial como a los cambios de diseño
  useEffect(() => {
    if (!design || !design.strands) {
      return; // No hacer nada si no hay diseño
    }
    
    // Si es el primer montaje, marcarlo como procesado
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    
    // Convertir el diseño del store al formato local
    const newStaffLines = design.strands.map((strand, index) => {
      return {
        id: index + 1,
        beads: strand.cells.map(cell => {
          if (cell.beadId && palette[cell.beadId]) {
            const beadData = palette[cell.beadId]
            return {
              id: `imported-${cell.beadId}`,
              color: beadData.hex,
              name: beadData.name,
              // Convertir la forma al formato local
              shape: beadData.shape as any,
            };
          }
          return null;
        }),
      };
    });
    
    if (newStaffLines.length > 0) {
      // Verificar si hay algún bead no nulo en el diseño
      const hasContent = newStaffLines.some(line => 
        line.beads.some(bead => bead !== null)
      );
      
      setStaffLines(newStaffLines);
      
      // Actualizar beadsPerLine basado en el diseño importado
      if (newStaffLines[0] && newStaffLines[0].beads) {
        setBeadsPerLine(newStaffLines[0].beads.length);
      }
      
      // Añadir colores personalizados de la paleta importada (de-duplicado y case-insensitive)
      const defaultColorSet = new Set(BEAD_COLORS.map(c => c.color.toLowerCase()))
      const importedColors = Object.values(palette)
        .map(bead => bead.hex?.toLowerCase?.() || bead.hex)
        .filter(Boolean) as string[]

      if (importedColors.length > 0) {
        setCustomColors(prev => {
          const prevSet = new Set(prev.map(c => c.toLowerCase()))
          const uniqueImported = Array.from(new Set(importedColors))
          const deletedSet = new Set(deletedCustomColors.map(c => c.toLowerCase()))
          const merged = [
            ...prev.map(c => c.toLowerCase()),
            ...uniqueImported.filter(c => !prevSet.has(c) && !defaultColorSet.has(c) && !deletedSet.has(c))
          ]
          return Array.from(new Set(merged))
        })
      }
      
      // Mostrar notificación de restauración solo en la carga inicial y si hay contenido real
      // La comprobación de isInitialMount.current ya no es necesaria ya que la establecemos en false arriba
      if (hasContent && !hasRestoredDesign) {
        toast({
          title: "Diseño restaurado",
          description: "Se ha recuperado el diseño guardado anteriormente.",
          action: (
            <Button variant="outline" size="sm" onClick={() => {
              const createNewDesign = useDesignStore.getState().createNewDesign;
              createNewDesign("Nuevo Diseño");
              window.location.reload();
            }}>
              <RotateCcw className="w-4 h-4 mr-1" /> Nuevo
            </Button>
          )
        });
        setHasRestoredDesign(true);
      }
    }
  }, [design, palette, toast, deletedCustomColors]);

  const addStaffLine = () => {
    const newLine: StaffLine = {
      id: staffLines.length + 1,
      beads: Array(beadsPerLine).fill(null),
    }
    const updated = [...staffLines, newLine]
    setStaffLines(updated)
    // Sincronizar con el store para persistencia inmediatamente usando snapshot
    syncWithStore(updated)
  }

  const removeStaffLine = (lineId?: number) => {
    if (lineId !== undefined) {
      // Eliminar una línea específica por su ID
      const newStaffLines = staffLines.filter(line => line.id !== lineId);
      
      if (newStaffLines.length === 0) {
        // Si se eliminaron todas las líneas, crear una línea nueva vacía
        const updatedSingle = [{ id: 1, beads: Array(beadsPerLine).fill(null) }]
        setStaffLines(updatedSingle)
        syncWithStore(updatedSingle)
      } else {
        // Renumerar las líneas para mantener IDs consecutivos
        const reorderedLines = newStaffLines.map((line, index) => ({
          ...line,
          id: index + 1
        }));
        
        setStaffLines(reorderedLines);
        syncWithStore(reorderedLines)
      }
    } else {
      // Comportamiento tradicional: eliminar la última línea
      if (staffLines.length > 1) {
        const trimmed = staffLines.slice(0, -1)
        setStaffLines(trimmed)
        syncWithStore(trimmed)
      } else {
        // Si solo queda una línea, reemplazarla por una vacía
        const updatedSingle = [{ id: 1, beads: Array(beadsPerLine).fill(null) }]
        setStaffLines(updatedSingle)
        syncWithStore(updatedSingle)
      }
    }
  }

  // Mantener las formas elegidas tal cual para almacenar/exportar
  const mapShapeForExport = (shape: string): string => {
    return shape;
  }
  
  const placeBead = (lineId: number, position: number) => {
    const newBead: Bead = {
      id: `${lineId}-${position}-${Date.now()}`,
      color: selectedColor.color,
      name: selectedColor.name,
      shape: selectedShape,
    }

    // Actualizar el estado local con updater y sincronizar con snapshot consistente
    setStaffLines(prev => {
      const updated = prev.map((line) =>
        line.id === lineId
          ? { ...line, beads: line.beads.map((bead, index) => (index === position ? newBead : bead)) }
          : line,
      );
      syncWithStore(updated);
      return updated;
    })
  }

  const removeBead = (lineId: number, position: number) => {
    // Actualizar el estado local con updater y sincronizar con snapshot consistente
    setStaffLines(prev => {
      const updated = prev.map((line) =>
        line.id === lineId
          ? { ...line, beads: line.beads.map((bead, index) => (index === position ? null : bead)) }
          : line,
      );
      syncWithStore(updated);
      return updated;
    })
  }

  // Función para sincronizar el estado local con el store de Zustand (acepta snapshot)
  const syncWithStore = (linesSnapshot?: StaffLine[]) => {
    const lines = linesSnapshot ?? staffLines;
    const storeState = useDesignStore.getState();
    const currentDesign = storeState.design;
    const importDesign = storeState.importDesign;

    // Construir paleta única a partir del snapshot
    const uniqueBeads = new Map<string, { id: string; name: string; hex: string; mm: number; shape: string }>();
    lines.forEach(line => {
      line.beads.forEach(bead => {
        if (bead) {
          const beadId = `${bead.color}-${bead.shape}`.replace(/#/g, "");
          uniqueBeads.set(beadId, {
            id: beadId,
            name: bead.name,
            hex: bead.color,
            mm: 6,
            shape: mapShapeForExport(bead.shape)
          });
        }
      });
    });

    // Construir nuevo diseño preservando datos existentes cuando sea posible
    const newDesign = {
      id: currentDesign.id,
      name: currentDesign.name,
      symmetry: currentDesign.symmetry,
      updatedAt: Date.now(),
      strands: lines.map((line, i) => {
        const existing = currentDesign.strands[i];
        return {
          id: existing?.id ?? `strand-${i + 1}`,
          name: existing?.name ?? `Línea ${i + 1}`,
          lengthCm: existing?.lengthCm ?? 18,
          diameterMm: existing?.diameterMm ?? 6,
          cells: line.beads.map((bead) => ({
            beadId: bead ? `${bead.color}-${bead.shape}`.replace(/#/g, "") : null,
          }))
        };
      })
    };

    // Importar como actualización interna (mismo id) fuera del ciclo de render
    const payload = {
      design: newDesign as any,
      palette: Array.from(uniqueBeads.values()) as any,
      inventory: Array.from(uniqueBeads.values()).map(b => ({ beadId: b.id, stock: 50 })) as any,
    };
    if (typeof window !== 'undefined') {
      // Deferir para evitar: "Cannot update a component while rendering..."
      setTimeout(() => importDesign(payload), 0);
    } else {
      importDesign(payload);
    }
  }

  const getBeadStyle = (bead: Bead) => {
    const baseStyle = {
      backgroundColor: bead.color,
      border: "2px solid rgba(0,0,0,0.2)",
      boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.2)",
    }

    switch (bead.shape) {
      case "round":
        return { ...baseStyle, borderRadius: "50%" }
      case "oval":
        return { ...baseStyle, borderRadius: "50%", transform: "scaleX(1.3)" }
      case "square":
        return { ...baseStyle, borderRadius: "4px" }
      case "star":
        return { 
          ...baseStyle, 
          borderRadius: "4px", 
          clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
        }
      case "tube":
        return { 
          ...baseStyle, 
          borderRadius: "4px", 
          transform: "scaleY(1.8)"
        }
      case "tube-horizontal":
        return { 
          ...baseStyle, 
          borderRadius: "4px", 
          transform: "scaleX(1.8)"
        }
      case "triangle":
        return { 
          ...baseStyle, 
          borderRadius: "0", 
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)"
        }
      case "diamond":
        return { 
          ...baseStyle, 
          borderRadius: "0", 
          transform: "rotate(45deg)"
        }
      default:
        return { ...baseStyle, borderRadius: "50%" }
    }
  }

  const exportDesign = () => {
    // Primero actualiza el diseño en el store
    const exportDesignData = useDesignStore.getState().exportDesignData
    const importDesign = useDesignStore.getState().importDesign
    
    // Crear un conjunto único de cuentas para la paleta
    const uniqueBeads = new Map()
    staffLines.forEach(line => {
      line.beads.forEach(bead => {
        if (bead) {
          const beadId = `${bead.color}-${bead.shape}`.replace(/#/g, "")
          uniqueBeads.set(beadId, {
            id: beadId,
            name: bead.name,
            hex: bead.color,
            mm: 6, // Valor predeterminado
            shape: mapShapeForExport(bead.shape)
          })
        }
      })
    })

    // Crear strands (líneas) para el diseño
    const strands = staffLines.map(line => {
      return {
        id: `strand-${line.id}`,
        name: `Línea ${line.id}`,
        lengthCm: 18, // Valor predeterminado
        diameterMm: 6, // Valor predeterminado
        cells: line.beads.map(bead => {
          if (bead) {
            const beadId = `${bead.color}-${bead.shape}`.replace(/#/g, "")
            return { beadId }
          }
          return { beadId: null }
        })
      }
    })

    // Crear el objeto completo del diseño
    const exportData = {
      design: {
        id: `design-${Date.now()}`,
        name: "Diseño de Pentagrama",
        strands: strands,
        symmetry: "none" as "none" | "mirror-center",
        updatedAt: Date.now()
      },
      palette: Array.from(uniqueBeads.values()),
      inventory: Array.from(uniqueBeads.values()).map(bead => ({
        beadId: bead.id,
        stock: 50
      }))
    }
    
    // Actualizar el store con los datos actuales para mantener sincronización
    importDesign(exportData)
    
    // Crear y descargar el archivo JSON
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bead-design.json"
    link.click()
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Diseñador de Cuentas</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Crea patrones de cuentas usando el sistema de pentagrama</p>
          </div>
          <Link href="/assembly">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Guía de Armado</span>
              <span className="sm:hidden">Guía</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Canvas */}
        <div className="lg:col-span-3">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
                Pentagrama de Cuentas
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => removeStaffLine()}>
                  <Minus className="w-4 h-4" />
                </Button>
                <Badge variant="secondary">{staffLines.length} líneas</Badge>
                <Button variant="outline" size="sm" onClick={addStaffLine}>
                  <Plus className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="outline" size="sm" onClick={() => undo()} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => redo()} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)">
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Staff Lines */}
            <div className="space-y-4 bg-muted/30 p-2 sm:p-4 pl-8 sm:pl-10 rounded-lg overflow-x-auto">
              {staffLines.map((line) => (
                <div key={line.id} className="relative min-w-max">
                  {/* Line number and remove button */}
                  <div className="absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <div className="text-xs sm:text-sm font-medium text-muted-foreground">{line.id}</div>
                    <button 
                      className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStaffLine(line.id);
                      }}
                      title="Eliminar esta línea"
                    >
                      <Minus className="w-2 h-2 sm:w-3 sm:h-3" />
                    </button>
                  </div>

                  {/* Staff line */}
                  <div className="h-px bg-border absolute top-1/2 left-0 right-0 -translate-y-1/2" />

                  {/* Bead positions */}
                  <div className="flex gap-1 py-4">
                    {line.beads.map((bead, position) => (
                      <div
                        key={position}
                        className="w-6 h-6 sm:w-8 sm:h-8 border border-dashed border-muted-foreground/30 rounded-full flex items-center justify-center cursor-pointer hover:border-primary transition-colors relative"
                        onClick={() => (bead ? removeBead(line.id, position) : placeBead(line.id, position))}
                      >
                        {bead && (
                          <div className="w-4 h-4 sm:w-6 sm:h-6" style={getBeadStyle(bead)} title={`${bead.name} - ${bead.shape}`} />
                        )}
                        {/* Position indicator - toggleable with 'R' */}
                        {showPositions && (
                          <div className={`absolute -bottom-6 text-xs text-muted-foreground ${position % 5 !== 0 ? "hidden sm:block" : ""}`}>
                            {position + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-4 border-t gap-4 sm:gap-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium">Cuentas por línea:</span>
                  <Button variant="outline" size="sm" className="h-7 sm:h-8" onClick={() => {
                    const newCount = Math.max(10, beadsPerLine - 5);
                    setBeadsPerLine(newCount);
                    
                    // Ajustar las líneas actuales al nuevo tamaño
                    const newStaffLines = staffLines.map(line => ({
                      ...line,
                      beads: line.beads.length > newCount 
                        ? line.beads.slice(0, newCount)
                        : [
                            ...line.beads, 
                            ...Array(newCount - line.beads.length).fill(null)
                          ]
                    }));
                    setStaffLines(newStaffLines);
                    
                    // Sincronizar con el store inmediatamente
                    syncWithStore(newStaffLines);
                  }}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Badge variant="outline">{beadsPerLine}</Badge>
                  <Button variant="outline" size="sm" className="h-7 sm:h-8" onClick={() => {
                    const newCount = Math.min(50, beadsPerLine + 5);
                    setBeadsPerLine(newCount);
                    
                    // Ajustar las líneas actuales al nuevo tamaño
                    const newStaffLines = staffLines.map(line => ({
                      ...line,
                      beads: line.beads.length > newCount 
                        ? line.beads.slice(0, newCount)
                        : [
                            ...line.beads, 
                            ...Array(newCount - line.beads.length).fill(null)
                          ]
                    }));
                    setStaffLines(newStaffLines);
                    
                    // Sincronizar con el store inmediatamente
                    syncWithStore(newStaffLines);
                  }}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex gap-2">
                <Button 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 h-9 sm:h-10" 
                  onClick={() => {
                    // Llamar a la función createNewDesign del store
                    const createNewDesign = useDesignStore.getState().createNewDesign;
                    
                    // Crear un nuevo diseño con el nombre "Nuevo Diseño"
                    createNewDesign("Nuevo Diseño");
                    
                    // Reiniciar el estado local
                    setStaffLines([
                      { id: 1, beads: Array(beadsPerLine).fill(null) },
                      { id: 2, beads: Array(beadsPerLine).fill(null) },
                      { id: 3, beads: Array(beadsPerLine).fill(null) },
                      { id: 4, beads: Array(beadsPerLine).fill(null) },
                      { id: 5, beads: Array(beadsPerLine).fill(null) },
                    ]);
                    
                    // Mostrar toast de confirmación
                    toast({
                      title: "Nuevo diseño creado",
                      description: "Se ha iniciado un nuevo diseño en blanco."
                    });
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">NUEVO</span>
                </Button>
                <ImportDialog />
                <Link href="/assembly" className="col-span-2 sm:col-span-1">
                  <Button variant="default" className="w-full sm:w-auto h-9 sm:h-10">
                    <Wrench className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Armado</span>
                  </Button>
                </Link>
                <Button variant="outline" onClick={exportDesign} className="h-9 sm:h-10">
                  <Upload className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Exportar</span>
                </Button>
                <Button variant="outline" className="h-9 sm:h-10">
                  <Share2 className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Compartir</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar - Becomes horizontal on mobile */}
        <div className="space-y-6">
          {/* Color Palette */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
              Paleta de Colores
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-2 gap-2 mb-2">
              {BEAD_COLORS.map((color) => (
                <button
                  key={color.color}
                  className={`w-full h-8 sm:h-10 rounded-lg border-2 transition-all ${
                    selectedColor.color === color.color
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ backgroundColor: color.color }}
                  onClick={() => {
                    setSelectedColor(color);
                    // No necesitamos sincronizar aquí, ya que solo estamos cambiando el color seleccionado
                    // La sincronización ocurrirá cuando se coloque la cuenta
                  }}
                  title={color.name}
                />
              ))}
              {customColors.map((color) => (
                <div key={`custom-${color.toLowerCase()}`} className="relative group">
                  <button
                    className={`w-full h-8 sm:h-10 rounded-lg border-2 transition-all ${
                      selectedColor.color.toLowerCase?.() === color.toLowerCase()
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor({ color, name: "Personalizado" })}
                    title={"Personalizado"}
                  />
                  <button
                    aria-label="Eliminar color personalizado"
                    title="Eliminar color de la paleta"
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background/90 border border-border text-xs leading-4 hidden group-hover:block"
                    onClick={(e) => {
                      e.stopPropagation();
                      const lc = color.toLowerCase();
                      setCustomColors(prev => prev.filter(c => c.toLowerCase() !== lc));
                      setDeletedCustomColors(prev => Array.from(new Set([...prev.map(c => c.toLowerCase()), lc])));
                      if (selectedColor.color.toLowerCase?.() === lc) {
                        setSelectedColor(BEAD_COLORS[0]);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                className="w-8 h-8 sm:w-10 sm:h-10 p-0 border rounded-lg cursor-pointer"
                onChange={e => {
                  const raw = e.target.value
                  const color = raw.toLowerCase()
                  const defaultColorSet = new Set(BEAD_COLORS.map(c => c.color.toLowerCase()))
                  const existsInCustom = customColors.some(c => c.toLowerCase() === color)
                  if (!existsInCustom && !defaultColorSet.has(color)) {
                    setCustomColors(prev => Array.from(new Set([...prev.map(c => c.toLowerCase()), color])))
                  }
                  // En caso de reintroducir un color previamente eliminado, quitarlo de la lista de eliminados
                  setDeletedCustomColors(prev => prev.filter(c => c.toLowerCase() !== color))
                  setSelectedColor({ color, name: "Personalizado" })
                  // No necesitamos sincronizar aquí, ya que solo estamos cambiando el color seleccionado
                  // La sincronización ocurrirá cuando se coloque la cuenta
                }}
                title="Escoge un color personalizado"
              />
              <span className="text-xs text-muted-foreground">Color personalizado</span>
            </div>
            <div className="mt-2 sm:mt-3 text-center">
              <Badge variant="secondary">{selectedColor.name}</Badge>
            </div>
          </Card>

          {/* Shape Selector */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Forma de Cuenta</h3>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
              {([
                { value: "round", label: "Redonda" },
                { value: "oval", label: "Ovalada" },
                { value: "square", label: "Cuadrada" },
                { value: "star", label: "Estrella" },
                { value: "tube", label: "Tubo Vertical" },
                { value: "tube-horizontal", label: "Tubo Horizontal" },
                { value: "triangle", label: "Triángulo" },
                { value: "diamond", label: "Diamante" }
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  className={`w-full p-1.5 sm:p-2 rounded-lg border text-left transition-colors ${
                    selectedShape === value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => {
                  setSelectedShape(value);
                  // No necesitamos sincronizar aquí, ya que solo estamos cambiando la forma seleccionada
                  // La sincronización ocurrirá cuando se coloque la cuenta
                }}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 border border-muted-foreground/30"
                      style={getBeadStyle({ id: "preview", color: selectedColor.color, name: selectedColor.name, shape: value })}
                    />
                    <span className="text-xs sm:text-sm">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Instrucciones</h3>
            <div className="text-xs sm:text-sm text-muted-foreground space-y-1 sm:space-y-2">
              <p>• Selecciona un color y forma</p>
              <p>• Haz clic en las posiciones para colocar cuentas</p>
              <p>• Haz clic en una cuenta para eliminarla</p>
              <p>• Usa los botones + y - para agregar/quitar líneas</p>
              <div className="pt-2">
                <p className="font-medium text-foreground">Atajos de teclado</p>
                <p>• Ctrl/Cmd + Z: Deshacer</p>
                <p>• Ctrl/Cmd + Shift + Z o Ctrl/Cmd + Y: Rehacer</p>
                <p>• R: Mostrar/Ocultar posiciones (Pentagrama)</p>
                <p>• G, R, +, -, 0: Grid, Regla y Zoom (Canvas avanzado)</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
