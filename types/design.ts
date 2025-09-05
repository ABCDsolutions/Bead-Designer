export interface BeadSpec {
  id: string
  name: string
  hex: string
  mm: number
  shape: "round" | "oval" | "square" | "tube" | "bicone"
}

export interface InventoryItem {
  beadId: string
  stock: number
}

export interface Cell {
  beadId: string | null
}

export interface Strand {
  id: string
  name: string
  lengthCm: number
  diameterMm: number
  cells: Cell[]
}

export interface Design {
  id: string
  name: string
  strands: Strand[]
  symmetry: "none" | "mirror-center"
  updatedAt: number
}

export interface Pattern {
  id: string
  name: string
  description: string
  category: "basic" | "geometric" | "gradient" | "complex"
  sequence: string // e.g., "A3-B2-C1" or "ABAB"
  preview: string[]
  minColors: number
  maxColors?: number
  difficulty: "easy" | "medium" | "hard"
}

export interface PatternTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  patterns: Pattern[]
  thumbnail: string
  difficulty: "beginner" | "intermediate" | "advanced"
  estimatedTime: string
  materials: string[]
}
