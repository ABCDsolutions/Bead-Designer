"use client"

import { useState, useEffect } from "react"
import { useDesignStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Copy, Share2, QrCode, ArrowLeft, Check } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

export default function SharePage() {
  const { design, palette, exportDesignData } = useDesignStore()
  const [shareUrl, setShareUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [shareCode, setShareCode] = useState("")
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    // Generate a unique share code for this design
    const code = btoa(JSON.stringify(exportDesignData())).slice(0, 12)
    setShareCode(code)
    setShareUrl(`${window.location.origin}/design/${code}`)
  }, [design, exportDesignData])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const shareViaWebAPI = async () => {
    const shareData = {
      title: `Diseño de Cuentas: ${design.name}`,
      text: `Mira este diseño de cuentas que creé con ${design.strands.length} hebra(s). Incluye ${Object.keys(palette).length} colores diferentes.`,
      url: shareUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      copyToClipboard(shareUrl)
    }
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Diseño de Cuentas: ${design.name}`)
    const body = encodeURIComponent(`
Hola,

Te comparto este diseño de cuentas que creé:

Nombre: ${design.name}
Hebras: ${design.strands.length}
Colores: ${Object.keys(palette).length}

Puedes verlo aquí: ${shareUrl}

¡Espero que te guste!
    `)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Mira este diseño de cuentas que creé: "${design.name}" con ${design.strands.length} hebra(s) y ${Object.keys(palette).length} colores. ${shareUrl}`,
    )
    window.open(`https://wa.me/?text=${text}`)
  }

  const materialsCount = design.strands.reduce(
    (acc, strand) => {
      strand.cells.forEach((cell) => {
        if (cell.beadId) {
          acc[cell.beadId] = (acc[cell.beadId] || 0) + 1
        }
      })
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Editor
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-emerald-900">Compartir Diseño</h1>
              <p className="text-emerald-700">{design.name}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Diseño</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {design.strands.map((strand, strandIndex) => (
                  <div key={strand.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-emerald-800">{strand.name}</h3>
                      <Badge variant="secondary">{strand.lengthCm}cm</Badge>
                    </div>

                    <div className="flex flex-wrap gap-1 p-3 bg-white rounded-lg border">
                      {strand.cells.slice(0, 20).map((cell, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-full border"
                          style={{
                            backgroundColor: cell.beadId ? palette[cell.beadId]?.hex : "#f3f4f6",
                          }}
                          title={cell.beadId ? palette[cell.beadId]?.name : "Vacío"}
                        />
                      ))}
                      {strand.cells.length > 20 && (
                        <span className="text-xs text-gray-500 ml-2">+{strand.cells.length - 20} más</span>
                      )}
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total hebras:</span>
                    <span className="font-medium ml-2">{design.strands.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Colores únicos:</span>
                    <span className="font-medium ml-2">{Object.keys(materialsCount).length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total cuentas:</span>
                    <span className="font-medium ml-2">
                      {Object.values(materialsCount).reduce((sum, count) => sum + count, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Longitud total:</span>
                    <span className="font-medium ml-2">
                      {design.strands.reduce((sum, strand) => sum + strand.lengthCm, 0)}cm
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sharing Options */}
          <div className="space-y-6">
            {/* Share Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                  Enlace de Compartir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="share-url">URL del Diseño</Label>
                  <div className="flex gap-2">
                    <Input id="share-url" value={shareUrl} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(shareUrl)}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="share-code">Código de Diseño</Label>
                  <div className="flex gap-2">
                    <Input id="share-code" value={shareCode} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(shareCode)}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">Otros usuarios pueden importar tu diseño usando este código</p>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Código QR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                    <QRCodeSVG value={shareUrl} size={150} />
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Escanea para abrir el diseño en cualquier dispositivo
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Share Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Compartir en Redes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Button onClick={shareViaWebAPI} className="w-full">
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartir (Nativo)
                  </Button>

                  <Button onClick={shareViaWhatsApp} variant="outline" className="w-full bg-transparent">
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                    WhatsApp
                  </Button>

                  <Button onClick={shareViaEmail} variant="outline" className="w-full bg-transparent">
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Email
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
