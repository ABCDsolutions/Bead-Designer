"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { useDesignStore } from "@/lib/store"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export function ImportDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [importMethod, setImportMethod] = useState<"file" | "text">("file")
  const [jsonText, setJsonText] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { toast } = useToast()

  const importDesign = useDesignStore((state) => state.importDesign)

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".json")) {
      setError("Por favor selecciona un archivo JSON válido")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        validateAndImport(data)
      } catch (err) {
        setError("Error al leer el archivo. Asegúrate de que sea un JSON válido.")
      }
    }
    reader.readAsText(file)
  }

  const handleTextImport = () => {
    try {
      const data = JSON.parse(jsonText)
      validateAndImport(data)
    } catch (err) {
      setError("JSON inválido. Verifica la sintaxis.")
    }
  }

  const validateAndImport = (data: any) => {
    setError("")

    // Validate required structure
    if (!data.design || !data.palette) {
      setError('El archivo JSON debe contener "design" y "palette"')
      return
    }

    if (!data.design.strands || !Array.isArray(data.design.strands)) {
      setError('El diseño debe contener un array de "strands"')
      return
    }

    if (!Array.isArray(data.palette)) {
      setError("La paleta debe ser un array de cuentas")
      return
    }

    try {
      importDesign(data)
      setSuccess("¡Diseño importado exitosamente!")
      
      // Notificar y cerrar el diálogo
      toast({
        title: "Diseño importado",
        description: "El diseño se ha importado correctamente",
      })
      
      // Cerrar el diálogo después de una breve pausa
      setTimeout(() => {
        setIsOpen(false)
        setSuccess("")
        setJsonText("")
      }, 1000)
    } catch (err) {
      setError("Error al importar el diseño")
    }
  }

  const resetDialog = () => {
    setError("")
    setSuccess("")
    setJsonText("")
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar Diseño
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Diseño JSON</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Method Selection */}
          <div className="flex gap-2">
            <Button
              variant={importMethod === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setImportMethod("file")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Archivo
            </Button>
            <Button
              variant={importMethod === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setImportMethod("text")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Texto
            </Button>
          </div>

          {/* File Import */}
          {importMethod === "file" && (
            <div className="space-y-2">
              <Label htmlFor="file-input">Seleccionar archivo JSON</Label>
              <Input
                id="file-input"
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">Selecciona un archivo JSON exportado previamente</p>
            </div>
          )}

          {/* Text Import */}
          {importMethod === "text" && (
            <div className="space-y-2">
              <Label htmlFor="json-text">Pegar JSON</Label>
              <Textarea
                id="json-text"
                placeholder='{"design": {...}, "palette": [...], "inventory": [...]}'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <Button onClick={handleTextImport} className="w-full">
                Importar desde Texto
              </Button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Formato esperado:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>design: objeto con strands y configuración</li>
              <li>palette: array de especificaciones de cuentas</li>
              <li>inventory: array de inventario (opcional)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
