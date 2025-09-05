"use client"

import type React from "react"

import { useState } from "react"
import { useDesignStore } from "@/lib/store"
import { generateUUID } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Plus, Edit, Trash2, Download, Upload, Palette, Package } from "lucide-react"
import type { BeadSpec, BeadShape } from "@/types/design"

export default function PalettePage() {
  const { palette, inventory, addBead, updateInventory, removeBead } = useDesignStore()
  const [editingBead, setEditingBead] = useState<BeadSpec | null>(null)
  const [isAddingBead, setIsAddingBead] = useState(false)

  const [newBead, setNewBead] = useState<Partial<BeadSpec>>({
    name: "",
    hex: "#000000",
    mm: 6,
    shape: "round",
    note: "",
  })

  const handleSaveBead = () => {
    if (newBead.name && newBead.hex) {
      const bead: BeadSpec = {
        id: editingBead?.id || generateUUID(),
        name: newBead.name,
        hex: newBead.hex,
        mm: newBead.mm || 6,
        shape: newBead.shape || "round",
        note: newBead.note,
      }

      addBead(bead)
      setNewBead({ name: "", hex: "#000000", mm: 6, shape: "round", note: "" })
      setEditingBead(null)
      setIsAddingBead(false)
    }
  }

  const handleEditBead = (bead: BeadSpec) => {
    setNewBead(bead)
    setEditingBead(bead)
    setIsAddingBead(true)
  }

  const exportPalette = () => {
    const data = {
      palette: Object.values(palette),
      inventory: Object.values(inventory),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bead-palette.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const importPalette = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.palette) {
            data.palette.forEach((bead: BeadSpec) => addBead(bead))
          }
          if (data.inventory) {
            data.inventory.forEach((item: any) => updateInventory(item.beadId, item.stock))
          }
        } catch (error) {
          console.error("Error importing palette:", error)
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Palette & Inventory Manager</h1>
          <p className="text-muted-foreground">Manage your bead colors, shapes, and inventory</p>
        </div>

        <div className="flex items-center gap-2">
          <input type="file" accept=".json" onChange={importPalette} className="hidden" id="import-palette" />
          <Button variant="outline" onClick={() => document.getElementById("import-palette")?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={exportPalette}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddingBead} onOpenChange={setIsAddingBead}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Bead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBead ? "Edit Bead" : "Add New Bead"}</DialogTitle>
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
                  <Label htmlFor="bead-size">Size (mm)</Label>
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
                      <SelectItem value="14">14mm</SelectItem>
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

                <div>
                  <Label htmlFor="bead-note">Notes (optional)</Label>
                  <Input
                    id="bead-note"
                    value={newBead.note || ""}
                    onChange={(e) => setNewBead({ ...newBead, note: e.target.value })}
                    placeholder="e.g., Matte finish, Czech glass"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingBead(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveBead}>{editingBead ? "Update" : "Add"} Bead</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="palette" className="space-y-6">
        <TabsList>
          <TabsTrigger value="palette">
            <Palette className="h-4 w-4 mr-2" />
            Palette
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="palette" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.values(palette).map((bead) => (
              <Card key={bead.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg border-2 border-border" style={{ backgroundColor: bead.hex }} />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditBead(bead)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeBead(bead.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">{bead.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{bead.mm}mm</Badge>
                    <Badge variant="outline">{bead.shape}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{bead.hex}</p>
                  {bead.note && <p className="text-sm text-muted-foreground italic">{bead.note}</p>}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid gap-4">
            {Object.values(palette).map((bead) => {
              const inventoryItem = inventory[bead.id]
              const stock = inventoryItem?.stock || 0
              const isLowStock = stock < 10

              return (
                <Card key={bead.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: bead.hex }} />
                      <div>
                        <h3 className="font-medium">{bead.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{bead.mm}mm</Badge>
                          <Badge variant="outline">{bead.shape}</Badge>
                          {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Stock</p>
                        <p className="text-lg font-semibold">{stock}</p>
                      </div>

                      <div className="w-32">
                        <Slider
                          value={[stock]}
                          onValueChange={([value]) => updateInventory(bead.id, value)}
                          max={100}
                          min={0}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <Input
                        type="number"
                        value={stock}
                        onChange={(e) => updateInventory(bead.id, Number.parseInt(e.target.value) || 0)}
                        className="w-20"
                        min="0"
                      />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
