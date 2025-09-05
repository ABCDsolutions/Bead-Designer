import { create } from "zustand"
import type { Design, BeadSpec, InventoryItem, Strand } from "@/types/design"

import { generateUUID } from "@/lib/utils"

interface DesignState {
  // Current design
  design: Design

  // Palette and inventory
  palette: Record<string, BeadSpec>
  inventory: Record<string, InventoryItem>

  // UI state
  selectedBeadId: string | null

  // History for undo/redo
  history: Design[]
  future: Design[]

  // Design actions
  setCell: (strandId: string, index: number, beadId: string | null) => void
  applyPattern: (strandId: string, range: [number, number], pattern: string) => void
  undo: () => void
  redo: () => void
  saveToHistory: () => void
  createNewDesign: (name: string) => void
  addStrand: () => void
  removeStrand: (strandId: string) => void
  setSymmetry: (symmetry: Design["symmetry"]) => void
  updateStrandLength: (strandId: string, lengthCm: number) => void
  updateStrandDiameter: (strandId: string, diameterMm: number) => void

  // Palette actions
  addBead: (bead: BeadSpec) => void
  removeBead: (beadId: string) => void
  updateBead: (beadId: string, updates: Partial<BeadSpec>) => void
  setSelectedBead: (beadId: string | null) => void

  // Inventory actions
  updateInventory: (beadId: string, stock: number) => void
  decrementStock: (beadId: string, amount?: number) => void
  incrementStock: (beadId: string, amount?: number) => void

  // Bulk actions
  clearAllBeads: (strandId?: string) => void
  fillRandom: (strandId: string) => void
  importPalette: (palette: BeadSpec[], inventory?: InventoryItem[]) => void
  exportPalette: () => { palette: BeadSpec[]; inventory: InventoryItem[] }

  exportDesignData: () => { design: Design; palette: BeadSpec[]; inventory: InventoryItem[] }
  exportSequence: () => string
  exportBOM: () => Array<{ beadId: string; name: string; count: number; hex: string; mm: number; shape: string }>
  importDesign: (designData: { design: Design; palette: BeadSpec[]; inventory?: InventoryItem[] }) => void
}

const createDefaultDesign = (): Design => ({
  id: generateUUID(),
  name: "New Design",
  strands: [
    {
      id: generateUUID(),
      name: "Strand 1",
      lengthCm: 18,
      diameterMm: 6,
      cells: Array(30)
        .fill(null)
        .map(() => ({ beadId: null })),
    },
  ],
  symmetry: "none",
  updatedAt: Date.now(),
})

const defaultPalette: Record<string, BeadSpec> = {
  red: { id: "red", name: "Red", hex: "#ef4444", mm: 6, shape: "round" },
  blue: { id: "blue", name: "Blue", hex: "#3b82f6", mm: 6, shape: "round" },
  green: { id: "green", name: "Green", hex: "#22c55e", mm: 6, shape: "round" },
  yellow: { id: "yellow", name: "Yellow", hex: "#eab308", mm: 6, shape: "round" },
  purple: { id: "purple", name: "Purple", hex: "#a855f7", mm: 6, shape: "round" },
  white: { id: "white", name: "White", hex: "#ffffff", mm: 6, shape: "round" },
  black: { id: "black", name: "Black", hex: "#000000", mm: 6, shape: "round" },
  orange: { id: "orange", name: "Orange", hex: "#f97316", mm: 6, shape: "round" },
  pink: { id: "pink", name: "Pink", hex: "#ec4899", mm: 6, shape: "round" },
  teal: { id: "teal", name: "Teal", hex: "#14b8a6", mm: 6, shape: "round" },
}

const defaultInventory: Record<string, InventoryItem> = Object.keys(defaultPalette).reduce(
  (acc, beadId) => {
    acc[beadId] = { beadId, stock: 50 }
    return acc
  },
  {} as Record<string, InventoryItem>,
)

const STORAGE_KEY = "bead-design-app-state"

const saveToLocalStorage = (state: Partial<DesignState>) => {
  if (typeof window === 'undefined') {
    return; // Skip saving on server-side rendering
  }

  try {
    const dataToSave = {
      design: state.design,
      palette: state.palette,
      inventory: state.inventory,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
  }
}

const loadFromLocalStorage = (): Partial<DesignState> | null => {
  if (typeof window === 'undefined') {
    return null; // Return null on server-side rendering
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      return {
        design: data.design || createDefaultDesign(),
        palette: data.palette || defaultPalette,
        inventory: data.inventory || defaultInventory,
      }
    }
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
  }
  return null
}

export const useDesignStore = create<DesignState>((set, get) => {
  const savedState = loadFromLocalStorage()

  return {
    design: savedState?.design || createDefaultDesign(),
    palette: savedState?.palette || defaultPalette,
    inventory: savedState?.inventory || defaultInventory,
    selectedBeadId: null,
    history: [],
    future: [],

    setCell: (strandId, index, beadId) => {
      const { design, saveToHistory, decrementStock } = get()
      saveToHistory()

      const newDesign = { ...design }
      const strand = newDesign.strands.find((s) => s.id === strandId)
      if (strand && strand.cells[index]) {
        const oldBeadId = strand.cells[index].beadId

        strand.cells[index] = { beadId }

        if (oldBeadId && oldBeadId !== beadId) {
          const { incrementStock } = get()
          incrementStock(oldBeadId, 1)
        }
        if (beadId && beadId !== oldBeadId) {
          decrementStock(beadId, 1)
        }

        if (design.symmetry === "mirror-center") {
          const mirrorIndex = strand.cells.length - 1 - index
          if (mirrorIndex !== index && strand.cells[mirrorIndex]) {
            strand.cells[mirrorIndex] = { beadId }
          }
        }
      }

      const updatedDesign = { ...newDesign, updatedAt: Date.now() }
      set({ design: updatedDesign })
      saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
    },

    applyPattern: (strandId, range, pattern) => {
      const { design, palette, saveToHistory } = get()
      saveToHistory()

      const newDesign = { ...design }
      const strand = newDesign.strands.find((s) => s.id === strandId)
      if (!strand) return

      const [start, end] = range
      const colors = Object.keys(palette)
      if (colors.length === 0) return

      if (pattern === "ABAB") {
        for (let i = start; i <= end; i++) {
          const beadId = colors[i % 2]
          strand.cells[i] = { beadId }
        }
      } else if (pattern === "AABB") {
        for (let i = start; i <= end; i++) {
          const beadId = colors[Math.floor(i / 2) % 2]
          strand.cells[i] = { beadId }
        }
      } else if (pattern === "RANDOM") {
        for (let i = start; i <= end; i++) {
          const beadId = colors[Math.floor(Math.random() * colors.length)]
          strand.cells[i] = { beadId }
        }
      }

      const updatedDesign = { ...newDesign, updatedAt: Date.now() }
      set({ design: updatedDesign })
      saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
    },

    addBead: (bead) => {
      set((state) => {
        const newState = {
          palette: { ...state.palette, [bead.id]: bead },
          inventory: { ...state.inventory, [bead.id]: { beadId: bead.id, stock: 50 } },
        }
        saveToLocalStorage({ design: state.design, palette: newState.palette, inventory: newState.inventory })
        return newState
      })
    },

    removeBead: (beadId) => {
      set((state) => {
        const newPalette = { ...state.palette }
        const newInventory = { ...state.inventory }
        delete newPalette[beadId]
        delete newInventory[beadId]

        const result = {
          palette: newPalette,
          inventory: newInventory,
          selectedBeadId: state.selectedBeadId === beadId ? null : state.selectedBeadId,
        };
        saveToLocalStorage({ design: state.design, palette: newPalette, inventory: newInventory });
        return result;
      })
    },

    updateBead: (beadId, updates) => {
      set((state) => {
        const updatedPalette = {
          ...state.palette,
          [beadId]: { ...state.palette[beadId], ...updates },
        };
        saveToLocalStorage({ design: state.design, palette: updatedPalette, inventory: state.inventory });
        return {
          palette: updatedPalette,
        };
      })
    },

    setSelectedBead: (beadId) => {
      set({ selectedBeadId: beadId })
    },

    updateInventory: (beadId, stock) => {
      set((state) => {
        const updatedInventory = { ...state.inventory, [beadId]: { beadId, stock } };
        saveToLocalStorage({ design: state.design, palette: state.palette, inventory: updatedInventory });
        return {
          inventory: updatedInventory,
        };
      })
    },

    decrementStock: (beadId, amount = 1) => {
      set((state) => {
        const currentStock = state.inventory[beadId]?.stock || 0
        const newStock = Math.max(0, currentStock - amount)
        const updatedInventory = { ...state.inventory, [beadId]: { beadId, stock: newStock } };
        saveToLocalStorage({ design: state.design, palette: state.palette, inventory: updatedInventory });
        return {
          inventory: updatedInventory,
        }
      })
    },

    incrementStock: (beadId, amount = 1) => {
      set((state) => {
        const currentStock = state.inventory[beadId]?.stock || 0
        const newStock = currentStock + amount
        const updatedInventory = { ...state.inventory, [beadId]: { beadId, stock: newStock } };
        saveToLocalStorage({ design: state.design, palette: state.palette, inventory: updatedInventory });
        return {
          inventory: updatedInventory,
        }
      })
    },

    clearAllBeads: (strandId) => {
      const { design, saveToHistory } = get()
      saveToHistory()

      const newDesign = { ...design }
      if (strandId) {
        const strand = newDesign.strands.find((s) => s.id === strandId)
        if (strand) {
          strand.cells = strand.cells.map(() => ({ beadId: null }))
        }
      } else {
        newDesign.strands.forEach((strand) => {
          strand.cells = strand.cells.map(() => ({ beadId: null }))
        })
      }

      const updatedDesign = { ...newDesign, updatedAt: Date.now() }
      set({ design: updatedDesign })
      saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
    },

    fillRandom: (strandId) => {
      const { design, palette, saveToHistory } = get()
      saveToHistory()

      const newDesign = { ...design }
      const strand = newDesign.strands.find((s) => s.id === strandId)
      const colors = Object.keys(palette)

      if (strand && colors.length > 0) {
        strand.cells = strand.cells.map(() => ({
          beadId: colors[Math.floor(Math.random() * colors.length)],
        }))
      }

      const updatedDesign = { ...newDesign, updatedAt: Date.now() }
      set({ design: updatedDesign })
      // Save to localStorage after filling random beads
      saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
    },

    importPalette: (palette, inventory) => {
      const newPalette: Record<string, BeadSpec> = {}
      const newInventory: Record<string, InventoryItem> = {}

      palette.forEach((bead) => {
        newPalette[bead.id] = bead
      })

      if (inventory) {
        inventory.forEach((item) => {
          newInventory[item.beadId] = item
        })
      } else {
        palette.forEach((bead) => {
          newInventory[bead.id] = { beadId: bead.id, stock: 50 }
        })
      }

      set((state) => {
        const updatedPalette = { ...state.palette, ...newPalette };
        const updatedInventory = { ...state.inventory, ...newInventory };
        saveToLocalStorage({ design: state.design, palette: updatedPalette, inventory: updatedInventory });
        return {
          palette: updatedPalette,
          inventory: updatedInventory,
        };
      })
    },

    importDesign: (designData) => {
      const { design, palette, inventory } = designData
      
      set((state) => {
        // Detectar si es una actualización o una importación real
        const isInternalUpdate = design.id === state.design.id;
        
        // Si es una actualización interna, preservamos el historial
        // Si es una importación externa, reseteamos el historial
        const historyUpdate = isInternalUpdate 
          ? {} 
          : { history: [], future: [] };
        
        const updatedDesign = { 
          ...design, 
          updatedAt: Date.now(),
          // Si es una actualización interna, preservar el nombre
          name: isInternalUpdate ? state.design.name : design.name
        };

        // Preparar nuevos datos de paleta e inventario
        const newPalette: Record<string, BeadSpec> = {}
        const newInventory: Record<string, InventoryItem> = {}

        palette.forEach((bead) => {
          newPalette[bead.id] = bead
        })

        if (inventory) {
          inventory.forEach((item) => {
            // Si el inventario ya existe, mantener el stock actual
            const currentStock = state.inventory[item.beadId]?.stock;
            newInventory[item.beadId] = { 
              beadId: item.beadId, 
              stock: isInternalUpdate && currentStock ? currentStock : item.stock 
            }
          })
        } else {
          palette.forEach((bead) => {
            const currentStock = state.inventory[bead.id]?.stock;
            newInventory[bead.id] = { 
              beadId: bead.id, 
              stock: isInternalUpdate && currentStock ? currentStock : 50 
            }
          })
        }

        // Mezclar los datos nuevos con los existentes
        const updatedPalette = { ...state.palette, ...newPalette };
        const updatedInventory = { ...state.inventory, ...newInventory };
        
        // Guardar en localStorage
        saveToLocalStorage({ 
          design: updatedDesign, 
          palette: updatedPalette, 
          inventory: updatedInventory 
        });
        
        // Devolver el nuevo estado
        return {
          design: updatedDesign,
          palette: updatedPalette,
          inventory: updatedInventory,
          ...historyUpdate
        };
      })
    },

    exportPalette: () => {
      const { palette, inventory } = get()
      return {
        palette: Object.values(palette),
        inventory: Object.values(inventory),
      }
    },

    exportDesignData: () => {
      const { design, palette, inventory } = get()
      return {
        design,
        palette: Object.values(palette),
        inventory: Object.values(inventory),
      }
    },

    exportSequence: () => {
      const { design, palette } = get()
      let sequence = `Diseño: ${design.name}\n`
      sequence += `Fecha: ${new Date(design.updatedAt).toLocaleDateString()}\n\n`

      design.strands.forEach((strand, index) => {
        sequence += `Hebra ${index + 1} (${strand.name}):\n`
        sequence += `Longitud: ${strand.lengthCm}cm, Diámetro: ${strand.diameterMm}mm\n`

        strand.cells.forEach((cell, cellIndex) => {
          if (cell.beadId) {
            const bead = palette[cell.beadId]
            sequence += `${cellIndex + 1}. ${bead?.name || "Unknown"} (${bead?.hex})\n`
          }
        })
        sequence += "\n"
      })

      return sequence
    },

    exportBOM: () => {
      const { design, palette } = get()
      const materialsCount: Record<string, number> = {}

      design.strands.forEach((strand) => {
        strand.cells.forEach((cell) => {
          if (cell.beadId) {
            materialsCount[cell.beadId] = (materialsCount[cell.beadId] || 0) + 1
          }
        })
      })

      return Object.entries(materialsCount).map(([beadId, count]) => {
        const bead = palette[beadId]
        return {
          beadId,
          name: bead?.name || "Unknown",
          count,
          hex: bead?.hex || "#000000",
          mm: bead?.mm || 6,
          shape: bead?.shape || "round",
        }
      })
    },

    saveToHistory: () => {
      const { design, history } = get()
      set({
        history: [...history.slice(-19), design],
        future: [],
      })
    },

    undo: () => {
      const { history, design, future } = get()
      if (history.length > 0) {
        const previousDesign = history[history.length - 1]
        set({
          design: previousDesign,
          history: history.slice(0, -1),
          future: [design, ...future],
        })
        // Save previous state to localStorage
        saveToLocalStorage({ design: previousDesign, palette: get().palette, inventory: get().inventory })
      }
    },

    redo: () => {
      const { future, design, history } = get()
      if (future.length > 0) {
        const nextDesign = future[0]
        set({
          design: nextDesign,
          history: [...history, design],
          future: future.slice(1),
        })
        // Save next state to localStorage
        saveToLocalStorage({ design: nextDesign, palette: get().palette, inventory: get().inventory })
      }
    },

    createNewDesign: (name) => {
      const newDesign = createDefaultDesign()
      newDesign.name = name
      set({ design: newDesign, history: [], future: [] })
      // Save to localStorage after creating new design
      saveToLocalStorage({ design: newDesign, palette: get().palette, inventory: get().inventory })
    },

    addStrand: () => {
      const { design } = get()
      const newStrand: Strand = {
        id: generateUUID(),
        name: `Strand ${design.strands.length + 1}`,
        lengthCm: 18,
        diameterMm: 6,
        cells: Array(30)
          .fill(null)
          .map(() => ({ beadId: null })),
      }

      const updatedDesign = {
        ...design,
        strands: [...design.strands, newStrand],
        updatedAt: Date.now(),
      }

      set({ design: updatedDesign })
      saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
    },

    removeStrand: (strandId) => {
      const { design } = get()
      if (design.strands.length > 1) {
        const updatedDesign = {
          ...design,
          strands: design.strands.filter((s) => s.id !== strandId),
          updatedAt: Date.now(),
        }
        set({ design: updatedDesign })
        // Save to localStorage after removing strand
        saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
      }
    },

    setSymmetry: (symmetry) => {
      const { design } = get()
      const updatedDesign = { ...design, symmetry, updatedAt: Date.now() }
      set({ design: updatedDesign })
      // Save to localStorage after setting symmetry
      saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
    },

    updateStrandLength: (strandId, lengthCm) => {
      const { design } = get()
      const newDesign = { ...design }
      const strand = newDesign.strands.find((s) => s.id === strandId)
      if (strand) {
        strand.lengthCm = lengthCm
        const updatedDesign = { ...newDesign, updatedAt: Date.now() }
        set({ design: updatedDesign })
        // Save to localStorage after updating strand length
        saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
      }
    },

    updateStrandDiameter: (strandId, diameterMm) => {
      const { design } = get()
      const newDesign = { ...design }
      const strand = newDesign.strands.find((s) => s.id === strandId)
      if (strand) {
        strand.diameterMm = diameterMm
        const updatedDesign = { ...newDesign, updatedAt: Date.now() }
        set({ design: updatedDesign })
        // Save to localStorage after updating strand diameter
        saveToLocalStorage({ design: updatedDesign, palette: get().palette, inventory: get().inventory })
      }
    },
  }
})
