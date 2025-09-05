"use client"

import { useDesignStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExportMenu } from "./export-menu"
import { ImportDialog } from "./import-dialog"
import { Palette, FileText, Share2, Undo2, Redo2, Plus, Minus, RotateCcw, Menu, X } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useState } from "react"

export function ToolbarHeader() {
  const { design, undo, redo, history, future, addStrand, removeStrand, clearAllBeads, createNewDesign } =
    useDesignStore()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  const canUndo = history.length > 0
  const canRedo = future.length > 0

  return (
    <div className="bg-white border-b border-emerald-200">
      {/* Desktop View */}
      <div className={`${isMobile ? 'hidden' : 'flex'} items-center justify-between p-4`}>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-emerald-900">{design.name}</h1>
            <p className="text-sm text-emerald-600">
              {design.strands.length} hebra{design.strands.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            Actualizado: {new Date(design.updatedAt).toLocaleDateString()}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4 mr-2" />
            Deshacer
          </Button>

          <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo}>
            <Redo2 className="h-4 w-4 mr-2" />
            Rehacer
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Strand Management */}
          <Button variant="outline" size="sm" onClick={addStrand}>
            <Plus className="h-4 w-4 mr-2" />
            Hebra
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => removeStrand(design.strands[design.strands.length - 1]?.id)}
            disabled={design.strands.length <= 1}
          >
            <Minus className="h-4 w-4 mr-2" />
            Hebra
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Navigation */}
          <Button variant="outline" size="sm" asChild>
            <a href="/templates">
              <Palette className="h-4 w-4 mr-2" />
              Templates
            </a>
          </Button>

          <Button variant="outline" size="sm" asChild>
            <a href="/assembly">
              <FileText className="h-4 w-4 mr-2" />
              Armado
            </a>
          </Button>

          <Button variant="outline" size="sm" asChild>
            <a href="/share">
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </a>
          </Button>

          <ImportDialog />

          <ExportMenu />

          {/* Clear/Reset */}
          <Button variant="outline" size="sm" onClick={() => clearAllBeads()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Mobile View */}
      <div className={`${isMobile ? 'flex' : 'hidden'} flex-col`}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3">
          <div>
            <h1 className="text-lg font-bold text-emerald-900">{design.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-emerald-600">
                {design.strands.length} hebra{design.strands.length !== 1 ? "s" : ""}
              </p>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                {new Date(design.updatedAt).toLocaleDateString()}
              </Badge>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="p-2 border-t border-emerald-100 bg-emerald-50 grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} className="flex-col p-2 h-auto">
              <Undo2 className="h-4 w-4 mb-1" />
              <span className="text-xs">Deshacer</span>
            </Button>

            <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} className="flex-col p-2 h-auto">
              <Redo2 className="h-4 w-4 mb-1" />
              <span className="text-xs">Rehacer</span>
            </Button>

            <Button variant="outline" size="sm" onClick={addStrand} className="flex-col p-2 h-auto">
              <Plus className="h-4 w-4 mb-1" />
              <span className="text-xs">Añadir</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => removeStrand(design.strands[design.strands.length - 1]?.id)} 
              disabled={design.strands.length <= 1}
              className="flex-col p-2 h-auto"
            >
              <Minus className="h-4 w-4 mb-1" />
              <span className="text-xs">Quitar</span>
            </Button>

            <Button variant="outline" size="sm" asChild className="flex-col p-2 h-auto">
              <a href="/templates">
                <Palette className="h-4 w-4 mb-1" />
                <span className="text-xs">Templates</span>
              </a>
            </Button>

            <Button variant="outline" size="sm" asChild className="flex-col p-2 h-auto">
              <a href="/assembly">
                <FileText className="h-4 w-4 mb-1" />
                <span className="text-xs">Armado</span>
              </a>
            </Button>

            <Button variant="outline" size="sm" asChild className="flex-col p-2 h-auto">
              <a href="/share">
                <Share2 className="h-4 w-4 mb-1" />
                <span className="text-xs">Compartir</span>
              </a>
            </Button>

            <ImportDialog isMobile={true} />

            <ExportMenu isMobile={true} />

            <Button variant="outline" size="sm" onClick={() => clearAllBeads()} className="flex-col p-2 h-auto">
              <RotateCcw className="h-4 w-4 mb-1" />
              <span className="text-xs">Limpiar</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
