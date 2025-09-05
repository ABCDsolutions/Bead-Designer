"use client"

import type React from "react"

import { useState } from "react"
import { useDesignStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ImportPage() {
  const { importPalette, createNewDesign } = useDesignStore()
  const [importCode, setImportCode] = useState("")
  const [importData, setImportData] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const importFromCode = async () => {
    if (!importCode.trim()) {
      setError("Por favor ingresa un código de diseño")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Decode the design data from the share code
      const decodedData = JSON.parse(atob(importCode))

      if (decodedData.design && decodedData.palette) {
        // Create new design with imported data
        createNewDesign(decodedData.design.name + " (Importado)")

        // Import palette and inventory
        importPalette(decodedData.palette, decodedData.inventory)

        setSuccess("Diseño importado exitosamente")
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } else {
        setError("Código de diseño inválido")
      }
    } catch (err) {
      setError("Error al decodificar el código de diseño")
    } finally {
      setLoading(false)
    }
  }

  const importFromJSON = async () => {
    if (!importData.trim()) {
      setError("Por favor pega los datos JSON del diseño")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const data = JSON.parse(importData)

      if (data.design && data.palette) {
        createNewDesign(data.design.name + " (Importado)")
        importPalette(data.palette, data.inventory)

        setSuccess("Diseño importado exitosamente desde JSON")
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } else {
        setError("Formato JSON inválido")
      }
    } catch (err) {
      setError("Error al parsear los datos JSON")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Editor
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">Importar Diseño</h1>
            <p className="text-emerald-700">Importa diseños compartidos por otros usuarios</p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Import by Code */}
        <Card>
          <CardHeader>
            <CardTitle>Importar por Código</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-code">Código de Diseño</Label>
              <Input
                id="import-code"
                placeholder="Pega aquí el código de diseño..."
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-gray-600">Ingresa el código de 12 caracteres que te compartieron</p>
            </div>

            <Button onClick={importFromCode} disabled={loading || !importCode.trim()} className="w-full">
              {loading ? "Importando..." : "Importar Diseño"}
            </Button>
          </CardContent>
        </Card>

        {/* Import by JSON */}
        <Card>
          <CardHeader>
            <CardTitle>Importar desde JSON</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-data">Datos del Diseño (JSON)</Label>
              <Textarea
                id="import-data"
                placeholder="Pega aquí los datos JSON del diseño..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">O sube un archivo JSON</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <Upload className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <Button
              onClick={importFromJSON}
              disabled={loading || !importData.trim()}
              variant="outline"
              className="w-full bg-transparent"
            >
              <FileText className="w-4 h-4 mr-2" />
              {loading ? "Importando..." : "Importar desde JSON"}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900">Código de Diseño:</h4>
              <p>Un código corto de 12 caracteres que puedes obtener de la página de compartir de cualquier diseño.</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">Datos JSON:</h4>
              <p>Los datos completos del diseño en formato JSON, incluyendo paleta de colores e inventario.</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">Archivo JSON:</h4>
              <p>Sube un archivo .json exportado desde la aplicación con todos los datos del diseño.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
