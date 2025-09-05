"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  ImageIcon, 
  ArrowLeft, 
  Wrench, 
  Download, 
  PenTool, 
  Layers, 
  CircleDot
} from "lucide-react"
import Link from "next/link"
import { useDesignStore } from "@/lib/store"
import { useSafeDesignData } from "@/hooks/use-safe-design"

export default function AssemblyPage() {
  // Use our safe hook to prevent hydration mismatches
  const { design, palette, inventory, isHydrated } = useSafeDesignData()
  const { exportBOM, exportSequence } = useDesignStore()
  
  // Use the safe design name
  const designName = design.name;

  const exportToPDF = () => {
    // Asegurar que tenemos los datos más actualizados
    const sequence = exportSequence()
    const content = `${sequence}

INSTRUCCIONES DE ARMADO:
1. Prepara todos los materiales necesarios según la lista adjunta
2. Sigue la secuencia de colores mostrada para cada línea
3. Ensarta las cuentas una por una en orden numérico
4. Presta atención a las diferentes formas de cuentas (redonda, ovalada, cuadrada, etc.)
5. Verifica el patrón antes de cerrar cada hebra
6. Asegúrate de que cada línea tenga la longitud y diámetro correcto

NOTAS:
- Usa hilo resistente apropiado para el peso de las cuentas
- Deja espacio suficiente para el cierre
- Revisa la tensión del hilo regularmente
- Si hay un patrón de simetría, verifica que ambos lados sean iguales
    `

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `guia-armado-${designName.toLowerCase().replace(/\s+/g, "-")}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const materialsList = exportBOM()

  // Función para renderizar una cuenta según su forma
  const renderBeadPreview = (bead: { hex: string; shape?: string }, size = "w-8 h-8") => {
    if (!bead) return null;
    
    const baseStyle: React.CSSProperties = {
      backgroundColor: bead.hex,
      border: "2px solid rgba(0,0,0,0.2)",
      boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.2)"
    };

    let shapeStyle: React.CSSProperties = { ...baseStyle, borderRadius: "50%" }; // Default round shape
    
    switch (bead.shape) {
      case "oval":
        shapeStyle = { ...baseStyle, borderRadius: "50%", transform: "scaleX(1.3)" };
        break;
      case "square":
        shapeStyle = { ...baseStyle, borderRadius: "4px" };
        break;
      case "tube":
        shapeStyle = { ...baseStyle, borderRadius: "4px", transform: "scaleY(1.8)" };
        break;
      case "bicone":
        shapeStyle = { 
          ...baseStyle, 
          borderRadius: "0", 
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" 
        };
        break;
      default:
        break;
    }
    
    return <div className={size} style={shapeStyle} />;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Editor
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Wrench className="w-8 h-8" />
                Guía de Armado
              </h1>
              <p className="text-muted-foreground">Instrucciones para: {designName}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={exportToPDF} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Exportar Guía
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Vista Previa del Artículo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isHydrated ? (
                  <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <p>Cargando el diseño...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {design.strands.map((strand, strandIndex) => (
                      <div key={strand.id} className="p-6 bg-muted/30 rounded-lg">
                        <h3 className="font-medium text-foreground mb-4">
                          {strand.name} - {strand.lengthCm}cm (Ø{strand.diameterMm}mm)
                        </h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {strand.cells.map((cell, cellIndex) => {
                            const bead = cell.beadId ? palette[cell.beadId] : null
                            return (
                              <div
                                key={cellIndex}
                                className="w-8 h-8 rounded-lg border-2 border-border flex items-center justify-center text-xs font-medium relative"
                                style={{
                                  backgroundColor: bead ? undefined : "#e5e7eb",
                                  color: bead ? (bead.hex === "#ffffff" ? "#000" : "#fff") : "#666",
                                }}
                                title={
                                  bead ? `${bead.name} - Forma: ${bead.shape} - Posición ${cellIndex + 1}` : `Vacío - Posición ${cellIndex + 1}`
                                }
                              >
                                {bead ? (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    {renderBeadPreview(bead)}
                                    <span className="relative z-10">{cellIndex + 1}</span>
                                  </div>
                                ) : (
                                  cellIndex + 1
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nueva sección: Información del Diseño */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Detalles del Diseño
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isHydrated ? (
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p>Cargando los detalles del diseño...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Nombre:</span>
                        <span className="text-sm">{designName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Última actualización:</span>
                        <span className="text-sm">{new Date(design.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Número de líneas:</span>
                        <Badge variant="outline">{design.strands.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Patrón de simetría:</span>
                        <Badge variant={design.symmetry === "mirror-center" ? "secondary" : "outline"}>
                          {design.symmetry === "mirror-center" ? "Simetría central" : "Sin simetría"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total de cuentas:</span>
                        <span className="text-sm">
                          {materialsList.reduce((total, material) => total + material.count, 0)} piezas
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Colores utilizados:</span>
                        <span className="text-sm">{materialsList.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Longitud total:</span>
                        <span className="text-sm">
                          {design.strands.reduce((total, strand) => total + strand.lengthCm, 0)} cm
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CircleDot className="w-5 h-5" />
                  Materiales Necesarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isHydrated ? (
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p>Cargando los materiales...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {materialsList.length > 0 ? (
                        materialsList.map((material) => {
                          const currentStock = inventory[material.beadId]?.stock || 0
                          const hasEnough = currentStock >= material.count

                          return (
                            <div
                              key={material.beadId}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  {renderBeadPreview({
                                    hex: material.hex,
                                    shape: material.shape
                                  }, "w-6 h-6")}
                                </div>
                                <div>
                                  <span className="text-sm font-medium">{material.name}</span>
                                  <div className="text-xs text-muted-foreground">
                                    Ø{material.mm}mm, {material.shape}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{material.count} piezas</span>
                                {!hasEnough && (
                                  <Badge variant="destructive" className="text-xs">
                                    Faltan {material.count - currentStock}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay cuentas en el diseño actual</p>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">Materiales adicionales:</p>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p>• Hilo de nylon o sedal resistente</p>
                        <p>• Aguja para cuentas</p>
                        <p>• Tijeras de precisión</p>
                        <p>• Cierre o broche adecuado</p>
                        <p>• Pinzas para joyería</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="w-5 h-5" />
                  Pasos de Armado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[2rem] justify-center">
                      1
                    </Badge>
                    <span>Prepara el hilo y las herramientas necesarias</span>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[2rem] justify-center">
                      2
                    </Badge>
                    <span>Corta el hilo según la longitud de cada hebra, añadiendo 10cm extra para el cierre</span>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[2rem] justify-center">
                      3
                    </Badge>
                    <span>Organiza las cuentas por color y forma siguiendo la vista previa</span>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[2rem] justify-center">
                      4
                    </Badge>
                    <span>Ensarta las cuentas una por una en orden numérico para cada hebra</span>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[2rem] justify-center">
                      5
                    </Badge>
                    <span>Verifica el patrón y la distribución de colores/formas antes de cerrar</span>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[2rem] justify-center">
                      6
                    </Badge>
                    <span>Ajusta la tensión y coloca el cierre según el tipo de joyería</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nueva sección: Consejos */}
            <Card>
              <CardHeader>
                <CardTitle>Consejos y Técnicas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>• Para cuentas de diferentes formas, ajusta la tensión del hilo según sea necesario</p>
                  <p>• Las cuentas tubulares funcionan mejor cuando se alinean correctamente</p>
                  <p>• Si usas cuentas de diferentes tamaños, coloca primero las más grandes</p>
                  <p>• Usa cera para hilo para fortalecer y proteger el trabajo</p>
                  <p>• Para diseños simétricos, trabaja desde el centro hacia afuera</p>
                  <p>• Guarda las cuentas sobrantes para posibles reparaciones</p>
                </div>
                
                <div className="mt-4">
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/templates">
                      <Download className="w-4 h-4 mr-2" />
                      Explorar Plantillas Similares
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
