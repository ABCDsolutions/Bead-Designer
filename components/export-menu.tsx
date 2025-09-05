"use client"
import { useDesignStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, Share2, FileSpreadsheet } from "lucide-react"

export function ExportMenu() {
  const { design, exportSequence, exportBOM, exportDesignData } = useDesignStore()

  const exportToPDF = () => {
    const sequence = exportSequence()
    const blob = new Blob([sequence], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${design.name}-instructions.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToCSV = () => {
    const bom = exportBOM()
    const csvContent = [
      ["Color", "Cantidad", "Código Hex", "Tamaño (mm)", "Forma"],
      ...bom.map((item) => [item.name, item.count.toString(), item.hex, item.mm.toString(), item.shape]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${design.name}-BOM.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToJSON = () => {
    const data = exportDesignData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${design.name}-design.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareDesign = async () => {
    const data = exportDesignData()
    const shareData = {
      title: `Diseño de Cuentas: ${design.name}`,
      text: `Mira este diseño de cuentas que creé con ${design.strands.length} hebra(s)`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      alert("Datos del diseño copiados al portapapeles")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Instrucciones (TXT)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Lista de Materiales (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <Download className="h-4 w-4 mr-2" />
          Diseño Completo (JSON)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={shareDesign}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartir Diseño
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
