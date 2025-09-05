"use client"

import { useState } from "react"
import { useDesignStore } from "@/lib/store"
import { generateUUID } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, AlertTriangle, Palette, Package } from "lucide-react"
import { CanvasTools } from "./canvas-tools"
import type { BeadSpec, BeadShape } from "@/types/design"

export function PaletteSidebar() {
  const { palette, inventory, design, setSymmetry, addBead, updateInventory, selectedBeadId, setSelectedBead } =
    useDesignStore()
  const [isAddingBead, setIsAddingBead] = useState(false)
  const [newBead, setNewBead] = useState<Partial<BeadSpec>>({
    name: "",
    hex: "#000000",
    mm: 6,
    shape: "round",
  })

  const handleSaveBead = () => {
    if (newBead.name && newBead.hex) {
      const bead: BeadSpec = {
        id: generateUUID(),
        name: newBead.name,
        hex: newBead.hex,
        mm: newBead.mm || 6,
        shape: newBead.shape || "round",
        note: newBead.note,
      }

      addBead(bead)
      updateInventory(bead.id, 50) // Default stock
      setNewBead({ name: "", hex: "#000000", mm: 6, shape: "round" })
      setIsAddingBead(false)
    }
  }

  const lowStockBeads = Object.values(palette).filter((bead) => {
    const stock = inventory[bead.id]?.stock || 0
    return stock < 10
  })

  return (
    <aside className="w-80 border-l bg-sidebar p-4 overflow-auto space-y-6">
      {/* Canvas Tools */}
      <CanvasTools />

      {/* Symmetry Controls */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Symmetry</h3>
        <div className="space-y-2">
          {(["none", "mirror-center", "mirror-lr"] as const).map((sym) => (
            <Button
              key={sym}
              variant={design.symmetry === sym ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              onClick={() => setSymmetry(sym)}
            >
              {sym === "none" && "None"}
              {sym === "mirror-center" && "Mirror Center"}
              {sym === "mirror-lr" && "Mirror L/R"}
            </Button>
          ))}
        </div>
      </Card>

      {/* Palette & Inventory */}
      <Tabs defaultValue="palette" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="palette">
            <Palette className="h-4 w-4 mr-2" />
            Palette
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            Stock
            {lowStockBeads.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {lowStockBeads.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="palette" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Colors</h3>
              <Dialog open={isAddingBead} onOpenChange={setIsAddingBead}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Bead</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bead-name">Name</Label>
                      <Input
                        id="bead-name"
                        value={newBead.name || ""}
                        onChange={(e) => setNewBead({ ...newBead, name: e.target.value })}
                        placeholder="e.g., Ruby Red"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bead-color">Color</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="bead-color"
                          type="color"
                          value={newBead.hex || "#000000"}
                          onChange={(e) => setNewBead({ ...newBead, hex: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={newBead.hex || "#000000"}
                          onChange={(e) => setNewBead({ ...newBead, hex: e.target.value })}
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bead-size">Size</Label>
                      <Select
                        value={newBead.mm?.toString()}
                        onValueChange={(value) => setNewBead({ ...newBead, mm: Number.parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4mm</SelectItem>
                          <SelectItem value="6">6mm</SelectItem>
                          <SelectItem value="8">8mm</SelectItem>
                          <SelectItem value="10">10mm</SelectItem>
                          <SelectItem value="12">12mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bead-shape">Shape</Label>
                      <Select
                        value={newBead.shape}
                        onValueChange={(value: BeadShape) => setNewBead({ ...newBead, shape: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="round">Round</SelectItem>
                          <SelectItem value="cylinder">Cylinder</SelectItem>
                          <SelectItem value="cube">Cube</SelectItem>
                          <SelectItem value="spacer">Spacer</SelectItem>
                          <SelectItem value="charm">Charm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddingBead(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveBead}>Add Bead</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {Object.values(palette).map((bead) => {
                const stock = inventory[bead.id]?.stock || 0
                const isSelected = selectedBeadId === bead.id
                const isLowStock = stock < 10

                return (
                  <button
                    key={bead.id}
                    className={`aspect-square rounded-lg border-2 transition-all relative group ${
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary"
                    }`}
                    style={{ backgroundColor: bead.hex }}
                    title={`${bead.name} (${bead.mm}mm) - Stock: ${stock}`}
                    onClick={() => setSelectedBead(bead.id)}
                  >
                    {/* Shape indicator */}
                    {bead.shape !== "round" && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2 h-2 bg-white/70 rounded-sm" />
                      </div>
                    )}

                    {/* Low stock warning */}
                    {isLowStock && (
                      <div className="absolute bottom-1 left-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      </div>
                    )}

                    {/* Stock indicator */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20 rounded-b-lg">
                      <div
                        className="h-full bg-white/70 rounded-b-lg transition-all"
                        style={{ width: `${Math.min(100, (stock / 50) * 100)}%` }}
                      />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  </button>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium mb-3">Stock Levels</h3>

            {lowStockBeads.length > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Low Stock Alert</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {lowStockBeads.length} bead{lowStockBeads.length > 1 ? "s" : ""} running low
                </p>
              </div>
            )}

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.values(palette).map((bead) => {
                const stock = inventory[bead.id]?.stock || 0
                const isLowStock = stock < 10

                return (
                  <div key={bead.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: bead.hex }} />
                      <div>
                        <p className="text-sm font-medium">{bead.name}</p>
                        <p className="text-xs text-muted-foreground">{bead.mm}mm</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      <Input
                        type="number"
                        value={stock}
                        onChange={(e) => updateInventory(bead.id, Number.parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-xs"
                        min="0"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
            Clear All
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
            Fill Random
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
            Apply Pattern
          </Button>
        </div>
      </Card>
    </aside>
  )
}
