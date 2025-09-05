"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, Download, Share2, Palette, Grid3X3, Wrench, Save, RotateCcw } from "lucide-react"
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
  const [hasRestoredDesign, setHasRestoredDesign] = useState(false)
  
  const { toast } = useToast()
  
  // Obtener el diseño actual y la paleta del store
  const design = useDesignStore(state => state.design)
  const palette = useDesignStore(state => state.palette)
  
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
      
      // Añadir colores personalizados de la paleta importada
      const importedColors = Object.values(palette)
        .filter(bead => !BEAD_COLORS.some(c => c.color === bead.hex))
        .map(bead => bead.hex);
      
      if (importedColors.length > 0) {
        setCustomColors(prev => [...prev, ...importedColors.filter(c => !prev.includes(c))]);
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
  }, [design, palette, toast]);

  const addStaffLine = () => {
    const newLine: StaffLine = {
      id: staffLines.length + 1,
      beads: Array(beadsPerLine).fill(null),
    }
    setStaffLines([...staffLines, newLine])
    
    // Sincronizar con el store para persistencia
    setTimeout(() => syncWithStore(), 0);
  }

  const removeStaffLine = (lineId?: number) => {
    if (lineId !== undefined) {
      // Eliminar una línea específica por su ID
      const newStaffLines = staffLines.filter(line => line.id !== lineId);
      
      if (newStaffLines.length === 0) {
        // Si se eliminaron todas las líneas, crear una línea nueva vacía
        setStaffLines([{
          id: 1,
          beads: Array(beadsPerLine).fill(null)
        }]);
      } else {
        // Renumerar las líneas para mantener IDs consecutivos
        const reorderedLines = newStaffLines.map((line, index) => ({
          ...line,
          id: index + 1
        }));
        
        setStaffLines(reorderedLines);
      }
    } else {
      // Comportamiento tradicional: eliminar la última línea
      if (staffLines.length > 1) {
        setStaffLines(staffLines.slice(0, -1));
      } else {
        // Si solo queda una línea, reemplazarla por una vacía
        setStaffLines([{
          id: 1,
          beads: Array(beadsPerLine).fill(null)
        }]);
      }
    }
    
    // Sincronizar con el store para persistencia
    setTimeout(() => syncWithStore(), 0);
  }

  // Función para mapear formas personalizadas a las formas soportadas por el store
  const mapShapeForExport = (shape: string): string => {
    // El tipo BeadSpec.shape en types/design.ts soporta: "round" | "oval" | "square" | "tube" | "bicone"
    switch (shape) {
      case "tube-horizontal": return "tube";
      case "star": return "round"; // Podríamos usar "bicone" como alternativa
      case "triangle": return "square";
      case "diamond": return "square";
      default: return shape;
    }
  }
  
  const placeBead = (lineId: number, position: number) => {
    const newBead: Bead = {
      id: `${lineId}-${position}-${Date.now()}`,
      color: selectedColor.color,
      name: selectedColor.name,
      shape: selectedShape,
    }

    // Actualizar el estado local
    setStaffLines(
      staffLines.map((line) =>
        line.id === lineId
          ? { ...line, beads: line.beads.map((bead, index) => (index === position ? newBead : bead)) }
          : line,
      ),
    )

    // Sincronizar con el store para persistencia
    // Debounce para reducir actualizaciones frecuentes
    setTimeout(() => syncWithStore(), 300);
  }

  const removeBead = (lineId: number, position: number) => {
    // Actualizar el estado local
    setStaffLines(
      staffLines.map((line) =>
        line.id === lineId
          ? { ...line, beads: line.beads.map((bead, index) => (index === position ? null : bead)) }
          : line,
      ),
    )

    // Sincronizar con el store para persistencia
    // Debounce para reducir actualizaciones frecuentes
    setTimeout(() => syncWithStore(), 300);
  }

  // Función para sincronizar el estado local con el store de Zustand
  const syncWithStore = () => {
    const storeState = useDesignStore.getState();
    const currentDesign = storeState.design;
    const importDesign = storeState.importDesign;
    
    // Crear un conjunto único de cuentas para la paleta
    const uniqueBeads = new Map();
    staffLines.forEach(line => {
      line.beads.forEach(bead => {
        if (bead) {
          const beadId = `${bead.color}-${bead.shape}`.replace(/#/g, "");
          uniqueBeads.set(beadId, {
            id: beadId,
            name: bead.name,
            hex: bead.color,
            mm: 6, // Valor predeterminado
            shape: mapShapeForExport(bead.shape)
          });
        }
      });
    });

    // Crear strands (líneas) para el diseño, preservando los IDs y propiedades existentes
    const strands = staffLines.map((line, idx) => {
      // Preservar el ID y las propiedades si esta strand ya existe
      const existingStrand = currentDesign.strands[idx];
      return {
        id: existingStrand ? existingStrand.id : `strand-${line.id}-${Date.now()}`,
        name: existingStrand ? existingStrand.name : `Línea ${line.id}`,
        lengthCm: existingStrand ? existingStrand.lengthCm : 18,
        diameterMm: existingStrand ? existingStrand.diameterMm : 6,
        cells: line.beads.map(bead => {
          if (bead) {
            const beadId = `${bead.color}-${bead.shape}`.replace(/#/g, "");
            return { beadId };
          }
          return { beadId: null };
        })
      };
    });

    // Crear el objeto del diseño preservando los datos existentes
    const exportData = {
      design: {
        // Preservar el ID original si existe
        id: currentDesign.id || `design-${Date.now()}`,
        name: currentDesign.name || "Diseño de Pentagrama",
        strands: strands,
        symmetry: currentDesign.symmetry || "none" as "none" | "mirror-center",
        updatedAt: Date.now()
      },
      // Convertir las cuentas únicas a un array
      palette: Array.from(uniqueBeads.values()),
      // Mantener el inventario existente y añadir nuevas cuentas con stock por defecto
      inventory: Array.from(uniqueBeads.values()).map(bead => {
        const existingInventory = storeState.inventory[bead.id];
        return {
          beadId: bead.id,
          stock: existingInventory ? existingInventory.stock : 50
        };
      })
    };
    
    // Actualizar el store con los datos actuales, pero preservando el historial
    importDesign(exportData);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Diseñador de Cuentas</h1>
            <p className="text-muted-foreground">Crea patrones de cuentas usando el sistema de pentagrama</p>
          </div>
          <Link href="/assembly">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Wrench className="w-4 h-4" />
              Ver Guía de Armado
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Canvas */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
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
              </div>
            </div>

            {/* Staff Lines */}
            <div className="space-y-4 bg-muted/30 p-4 pl-10 rounded-lg">
              {staffLines.map((line) => (
                <div key={line.id} className="relative">
                  {/* Line number and remove button */}
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <div className="text-sm font-medium text-muted-foreground">{line.id}</div>
                    <button 
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStaffLine(line.id);
                      }}
                      title="Eliminar esta línea"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Staff line */}
                  <div className="h-px bg-border absolute top-1/2 left-0 right-0 -translate-y-1/2" />

                  {/* Bead positions */}
                  <div className="flex gap-1 py-4">
                    {line.beads.map((bead, position) => (
                      <div
                        key={position}
                        className="w-8 h-8 border border-dashed border-muted-foreground/30 rounded-full flex items-center justify-center cursor-pointer hover:border-primary transition-colors relative"
                        onClick={() => (bead ? removeBead(line.id, position) : placeBead(line.id, position))}
                      >
                        {bead && (
                          <div className="w-6 h-6" style={getBeadStyle(bead)} title={`${bead.name} - ${bead.shape}`} />
                        )}
                        {/* Position indicator */}
                        <div className="absolute -bottom-6 text-xs text-muted-foreground">{position + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Cuentas por línea:</span>
                  <Button variant="outline" size="sm" onClick={() => {
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
                    
                    // Sincronizar con el store
                    setTimeout(() => syncWithStore(), 0);
                  }}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Badge variant="outline">{beadsPerLine}</Badge>
                  <Button variant="outline" size="sm" onClick={() => {
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
                    
                    // Sincronizar con el store
                    setTimeout(() => syncWithStore(), 0);
                  }}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700" 
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
                  <RotateCcw className="w-4 h-4 mr-2" />
                  NUEVO
                </Button>
                <ImportDialog />
                <Link href="/assembly">
                  <Button variant="default">
                    <Wrench className="w-4 h-4 mr-2" />
                    Armado
                  </Button>
                </Link>
                <Button variant="outline" onClick={exportDesign}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Color Palette */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Paleta de Colores
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {BEAD_COLORS.map((color) => (
                <button
                  key={color.color}
                  className={`w-full h-10 rounded-lg border-2 transition-all ${
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
                <button
                  key={color}
                  className={`w-full h-10 rounded-lg border-2 transition-all ${
                    selectedColor.color === color
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor({ color, name: "Personalizado" })}
                  title={"Personalizado"}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                className="w-10 h-10 p-0 border rounded-lg cursor-pointer"
                onChange={e => {
                  const color = e.target.value
                  if (!customColors.includes(color)) {
                    setCustomColors([...customColors, color])
                  }
                  setSelectedColor({ color, name: "Personalizado" })
                  // No necesitamos sincronizar aquí, ya que solo estamos cambiando el color seleccionado
                  // La sincronización ocurrirá cuando se coloque la cuenta
                }}
                title="Escoge un color personalizado"
              />
              <span className="text-xs text-muted-foreground">Color personalizado</span>
            </div>
            <div className="mt-3 text-center">
              <Badge variant="secondary">{selectedColor.name}</Badge>
            </div>
          </Card>

          {/* Shape Selector */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Forma de Cuenta</h3>
            <div className="space-y-2">
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
                  className={`w-full p-2 rounded-lg border text-left transition-colors ${
                    selectedShape === value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => {
                  setSelectedShape(value);
                  // No necesitamos sincronizar aquí, ya que solo estamos cambiando la forma seleccionada
                  // La sincronización ocurrirá cuando se coloque la cuenta
                }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 border border-muted-foreground/30"
                      style={getBeadStyle({ id: "preview", color: selectedColor.color, name: selectedColor.name, shape: value })}
                    />
                    <span className="text-sm">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Instrucciones</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Selecciona un color y forma</p>
              <p>• Haz clic en las posiciones para colocar cuentas</p>
              <p>• Haz clic en una cuenta para eliminarla</p>
              <p>• Usa los botones + y - para agregar/quitar líneas</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
