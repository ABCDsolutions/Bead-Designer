import { create } from "zustand"
import type { Design, BeadSpec, InventoryItem, Strand } from "@/types/design"
// cloneDeep ya no se utiliza tras optimización de actualizaciones focalizadas

import { generateUUID } from "@/lib/utils"

interface DesignState {
  // Current design
  design: Design

  // Palette and inventory
  palette: Record<string, BeadSpec>
  inventory: Record<string, InventoryItem>

  // UI state
  selectedBeadId: string | null
  
  // Control de actualizaciones de UI
  lastUpdate: number

  // History for undo/redo
  history: Design[]
  future: Design[]

  // History batching
  historyBatchActive?: boolean
  historyBatchTimer?: number | null
  beginHistoryBatch: () => void
  endHistoryBatch: () => void

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
    // Validar que tengamos datos válidos antes de guardar
    if (!state || !state.design || !Array.isArray(state.design.strands)) {
      console.error("Error: Intentando guardar datos inválidos:", state);
      return;
    }
    
    // Verificación adicional: asegurarse de que todas las hebras tengan celdas
    const allStrandsValid = state.design.strands.every(strand => 
      strand && strand.id && Array.isArray(strand.cells)
    );
    
    if (!allStrandsValid) {
      console.error("Error: Algunas hebras tienen estructura inválida", state.design.strands);
      return; // No guardar datos corruptos
    }
    
    // Crear una copia limpia de los datos para guardar
    // Esto evita problemas con referencias circulares o datos corruptos
    const cleanDesign = {
      id: state.design.id,
      name: state.design.name,
      symmetry: state.design.symmetry,
      updatedAt: state.design.updatedAt,
      strands: state.design.strands.map(strand => ({
        id: strand.id,
        name: strand.name,
        lengthCm: strand.lengthCm,
        diameterMm: strand.diameterMm,
        cells: strand.cells.map(cell => ({
          beadId: cell.beadId
        }))
      }))
    };
    
    const dataToSave = {
      design: cleanDesign,
      palette: state.palette,
      inventory: state.inventory,
      timestamp: Date.now(),
      version: "1.1.0", // Actualizado a versión 1.1.0 con formato mejorado
    }
    
    // Crear un backup rotativo (mantener múltiples backups)
    // Esto permitirá recuperarse si el último guardado fue corrupto
    try {
      // Mover el backup actual al backup histórico
      const existingData = localStorage.getItem(STORAGE_KEY);
      if (existingData) {
        // Intentar verificar si el backup es válido antes de guardarlo
        const parsed = JSON.parse(existingData);
        if (parsed && parsed.design && Array.isArray(parsed.design.strands)) {
          // Guardar en un backup con timestamp
          const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
          localStorage.setItem(`${STORAGE_KEY}_backup_${timestamp}`, existingData);
          
          // Mantener un backup simple también
          localStorage.setItem(STORAGE_KEY + "_backup", existingData);
          
          // Limitar a 5 backups históricos para no sobrecargar el localStorage
          const allKeys = Object.keys(localStorage);
          const backupKeys = allKeys.filter(key => 
            key.startsWith(`${STORAGE_KEY}_backup_`)
          ).sort();
          
          if (backupKeys.length > 5) {
            // Eliminar los backups más antiguos
            backupKeys.slice(0, backupKeys.length - 5).forEach(key => {
              localStorage.removeItem(key);
            });
          }
        }
      }
    } catch (backupError) {
      console.error("Error al crear backup:", backupError);
      // Continuar con el guardado principal aunque el backup falle
    }
    
    // Guardar los nuevos datos
    try {
      const serializedData = JSON.stringify(dataToSave);
      localStorage.setItem(STORAGE_KEY, serializedData);
      console.log(`[Storage] Datos guardados correctamente (${serializedData.length} bytes)`);
    } catch (saveError) {
      console.error("Error al serializar o guardar datos:", saveError);
      // Intentar guardar una versión más básica si falló la completa
      try {
        // Versión minimalista para evitar pérdida total
        const minimalData = {
          design: {
            id: state.design.id,
            name: state.design.name,
            strands: state.design.strands.map(s => ({
              id: s.id,
              cells: s.cells.map(c => ({ beadId: c.beadId }))
            }))
          }
        };
        localStorage.setItem(STORAGE_KEY + "_minimal", JSON.stringify(minimalData));
        console.log("[Storage] Guardado datos en formato minimalista como respaldo");
      } catch (e) {
        console.error("Error crítico: No se pudo guardar ni siquiera datos minimales", e);
      }
    }
  } catch (error) {
    console.error("Error general al guardar en localStorage:", error);
  }
}

const loadFromLocalStorage = (): Partial<DesignState> | null => {
  if (typeof window === 'undefined') {
    return null; // Return null on server-side rendering
  }

  let designData: any = null;
  let isRestoredFromBackup = false;
  let backupSource = "";
  
  try {
    // Función de validación de datos
    const isValidDesignData = (data: any): boolean => {
      // Verificar estructura básica
      if (!data || !data.design || !Array.isArray(data.design.strands)) {
        return false;
      }
      
      // Verificar que cada hebra tenga una estructura correcta
      for (const strand of data.design.strands) {
        if (!strand || !strand.id || !Array.isArray(strand.cells)) {
          return false;
        }
        // Verificar que cada celda tiene la estructura correcta
        for (const cell of strand.cells) {
          if (cell === null || typeof cell !== 'object') {
            return false;
          }
          // beadId puede ser null pero la celda debe ser un objeto
          if (!('beadId' in cell)) {
            return false;
          }
        }
      }
      
      return true;
    };
    
    const tryLoadData = (storageKey: string, description: string): any | null => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (!saved) return null;
        
        const data = JSON.parse(saved);
        if (isValidDesignData(data)) {
          console.log(`[Storage] Datos cargados desde ${description}: ${data.design.strands.length} hebras`);
          return data;
        } else {
          console.warn(`[Storage] Datos en ${description} tienen estructura inválida:`, data);
          return null;
        }
      } catch (e) {
        console.error(`[Storage] Error al cargar desde ${description}:`, e);
        return null;
      }
    };
    
    // Intentar cargar desde almacenamiento principal
    designData = tryLoadData(STORAGE_KEY, "almacenamiento principal");
    
    // Si no encontramos datos válidos, intentar con los backups en orden de prioridad
    if (!designData) {
      console.log("[Storage] Intentando cargar desde backups...");
      
      // 1. Primero intentar con el backup más reciente
      designData = tryLoadData(STORAGE_KEY + "_backup", "backup principal");
      if (designData) {
        isRestoredFromBackup = true;
        backupSource = "backup principal";
      }
      
      // 2. Si no funciona, intentar con los backups históricos (del más reciente al más antiguo)
      if (!designData) {
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys
          .filter(key => key.startsWith(`${STORAGE_KEY}_backup_`))
          .sort((a, b) => b.localeCompare(a)); // Ordenar de más reciente a más antiguo
          
        for (const key of backupKeys) {
          designData = tryLoadData(key, `backup histórico (${key})`);
          if (designData) {
            isRestoredFromBackup = true;
            backupSource = key;
            break;
          }
        }
      }
      
      // 3. Como último recurso, intentar con el backup minimalista
      if (!designData) {
        designData = tryLoadData(STORAGE_KEY + "_minimal", "backup minimalista");
        if (designData) {
          isRestoredFromBackup = true;
          backupSource = "backup minimalista";
          
          // Completar datos faltantes en caso de backup minimalista
          if (designData.design) {
            designData.design.updatedAt = Date.now();
            designData.design.symmetry = designData.design.symmetry || "none";
            
            // Asegurar que cada hebra tiene todos sus datos
            if (Array.isArray(designData.design.strands)) {
              designData.design.strands = designData.design.strands.map((s: any) => ({
                id: s.id,
                name: s.name || `Hebra ${Math.floor(Math.random() * 1000)}`,
                lengthCm: s.lengthCm || 18,
                diameterMm: s.diameterMm || 6,
                cells: Array.isArray(s.cells) ? s.cells : Array(30).fill({ beadId: null })
              }));
            }
          }
        }
      }
    }
    
    // Si no encontramos ningún dato válido, usar valores por defecto
    if (!designData) {
      console.log("[Storage] No se encontraron datos válidos, usando valores por defecto");
      return null;
    }
    
    // Si estamos restaurando desde un backup, notificar
    if (isRestoredFromBackup) {
      console.warn(`[Storage] ⚠️ DISEÑO RESTAURADO desde ${backupSource}`);
      // Mostrar alerta visual al usuario usando setTimeout para asegurar que la UI esté lista
      setTimeout(() => {
        try {
          alert(`⚠️ Diseño restaurado desde copia de seguridad (${backupSource}).
          
Es posible que algunos cambios recientes no se hayan guardado correctamente.

Si experimentas problemas persistentes, considera exportar tu diseño como respaldo adicional.`);
        } catch (e) {
          console.error("[Storage] Error al mostrar alerta:", e);
        }
      }, 1500);
    }
    
    // Devolver los datos cargados
    return {
      design: designData.design,
      palette: designData.palette || defaultPalette,
      inventory: designData.inventory || defaultInventory
    };
    
  } catch (error) {
    console.error("[Storage] Error crítico al cargar desde localStorage:", error);
    
    // En caso de error crítico, intentar mostrar una notificación al usuario
    setTimeout(() => {
      try {
        alert(`⚠️ Se produjo un error al cargar tu diseño.

Recomendamos:
1. Revisar si hay errores en la consola
2. Exportar tu diseño después de cada sesión importante
3. Si el problema persiste, contactar al soporte técnico`);
      } catch (e) {
        // Ignorar error al mostrar alerta
      }
    }, 1500);
    
    return null;
  }
}

// Interfaz para los backups de emergencia
interface EmergencyBackup {
  design: Design;
  palette?: Record<string, BeadSpec>;
  inventory?: Record<string, InventoryItem>;
}

// Función para crear un backup de emergencia en sessionStorage
// Este backup se usa solo si hay un error crítico y se pierde localStorage
const createEmergencyBackup = (state: Partial<DesignState>) => {
  try {
    if (typeof window === 'undefined' || !state || !state.design) return;
    
    // Guardar solo lo esencial para minimizar tamaño
    const minimalState: EmergencyBackup = {
      design: {
        id: state.design.id,
        name: state.design.name,
        symmetry: state.design.symmetry,
        updatedAt: state.design.updatedAt,
        strands: state.design.strands.map(s => ({
          id: s.id,
          name: s.name,
          lengthCm: s.lengthCm || 18,
          diameterMm: s.diameterMm || 6,
          cells: s.cells.map(c => ({ beadId: c.beadId }))
        }))
      }
    };
    
    // Opcionalmente incluir paleta e inventario si están disponibles
    if (state.palette) minimalState.palette = state.palette;
    if (state.inventory) minimalState.inventory = state.inventory;
    
    sessionStorage.setItem('bead-design-emergency-backup', JSON.stringify(minimalState));
  } catch (e) {
    console.error('[Emergency Backup] Error al crear backup de emergencia:', e);
  }
};

// Verificar si hay un backup de emergencia al iniciar
const checkEmergencyBackup = (): EmergencyBackup | null => {
  try {
    if (typeof window === 'undefined') return null;
    
    const backup = sessionStorage.getItem('bead-design-emergency-backup');
    if (!backup) return null;
    
    const data = JSON.parse(backup);
    if (!data || !data.design || !Array.isArray(data.design.strands)) {
      return null;
    }
    
    // Completar datos faltantes
    data.design.updatedAt = Date.now();
    data.design.symmetry = data.design.symmetry || "none";
    data.design.strands = data.design.strands.map((s: any) => ({
      id: s.id,
      name: s.name || 'Hebra recuperada',
      lengthCm: s.lengthCm || 18,
      diameterMm: s.diameterMm || 6,
      cells: Array.isArray(s.cells) ? s.cells : Array(30).fill({ beadId: null })
    }));
    
    console.warn('[Emergency Recovery] Diseño recuperado de backup de emergencia');
    alert('Se ha recuperado un diseño desde un backup de emergencia. Es posible que algunos cambios recientes no se hayan guardado.');
    
    // Limpiar el backup de emergencia para no usarlo nuevamente
    sessionStorage.removeItem('bead-design-emergency-backup');
    
    return {
      design: data.design,
      palette: data.palette,
      inventory: data.inventory
    };
  } catch (e) {
    console.error('[Emergency Recovery] Error al verificar backup de emergencia:', e);
    return null;
  }
};

export const useDesignStore = create<DesignState>((set, get) => {
  // Intentar recuperar primero de un backup de emergencia
  const emergencyBackup = checkEmergencyBackup();
  // Si no hay backup de emergencia, cargar del localStorage normal
  const savedState = loadFromLocalStorage();
  
  // Configurar un intervalo para crear backups de emergencia
  if (typeof window !== 'undefined') {
    const backupInterval = setInterval(() => {
      try {
        createEmergencyBackup({
          design: get().design,
          palette: get().palette,
          inventory: get().inventory
        });
      } catch (e) {
        console.error('[Backup Interval] Error al crear backup automático:', e);
      }
    }, 60000); // Backup cada minuto
    
    // Limpiar el intervalo cuando se cierra la ventana
    window.addEventListener('beforeunload', () => {
      clearInterval(backupInterval);
    });
  }

  // Crear estado inicial basado en lo que hemos podido recuperar
  let initialDesign = createDefaultDesign();
  let initialPalette = defaultPalette;
  let initialInventory = defaultInventory;
  
  // Primero intentar usar emergencyBackup
  if (emergencyBackup && emergencyBackup.design) {
    console.log('[Store Init] Usando diseño de backup de emergencia');
    initialDesign = emergencyBackup.design;
    
    // Usar paleta e inventario del backup si existen
    if (emergencyBackup.palette) {
      initialPalette = emergencyBackup.palette;
    }
    
    if (emergencyBackup.inventory) {
      initialInventory = emergencyBackup.inventory;
    }
  } 
  // Si no hay backup de emergencia, usar localStorage
  else if (savedState) {
    console.log('[Store Init] Usando diseño de localStorage');
    initialDesign = savedState.design || initialDesign;
    initialPalette = savedState.palette || initialPalette;
    initialInventory = savedState.inventory || initialInventory;
  }

  return {
    design: initialDesign,
    palette: initialPalette,
    inventory: initialInventory,
    selectedBeadId: null,
    history: [],
    future: [],
    lastUpdate: Date.now(), // Añadimos esta propiedad para forzar actualizaciones de la UI
    historyBatchActive: false,
    historyBatchTimer: null,

    beginHistoryBatch: () => {
      const BATCH_IDLE_MS = 600;
      const state = get();
      // Guardar snapshot previo solo al iniciar el batch
      if (!state.historyBatchActive) {
        try {
          state.saveToHistory();
        } catch (e) {
          console.error('[HistoryBatch] Error al guardar snapshot inicial:', e);
        }
      }

      if (typeof window !== 'undefined') {
        // Reiniciar temporizador de inactividad
        if (state.historyBatchTimer) {
          try { window.clearTimeout(state.historyBatchTimer as unknown as number); } catch {}
        }
        const id = window.setTimeout(() => {
          set({ historyBatchActive: false, historyBatchTimer: null });
        }, BATCH_IDLE_MS) as unknown as number;
        set({ historyBatchActive: true, historyBatchTimer: id });
      } else {
        set({ historyBatchActive: true });
      }
    },

    endHistoryBatch: () => {
      const state = get();
      if (typeof window !== 'undefined' && state.historyBatchTimer) {
        try { window.clearTimeout(state.historyBatchTimer as unknown as number); } catch {}
      }
      set({ historyBatchActive: false, historyBatchTimer: null });
    },

    setCell: (strandId, index, beadId) => {
      try { get().beginHistoryBatch(); } catch {}
      set((state) => {
        const strandIndex = state.design.strands.findIndex(s => s.id === strandId);
        if (strandIndex === -1) {
          console.error(`[Store] setCell ERROR: No se encontró la hebra con id ${strandId}`);
          return state;
        }
        const strand = state.design.strands[strandIndex];
        if (!strand.cells || index < 0 || index >= strand.cells.length) {
          console.error(`[Store] setCell ERROR: Índice ${index} fuera de rango para la hebra ${strandId}`);
          return state;
        }
        const currentBeadId = strand.cells[index].beadId;
        if (currentBeadId === beadId) {
          return state;
        }

        // Actualización inmutable focalizada (sin cloneDeep)
        const updatedStrands = state.design.strands.map((s, i) => {
          if (i !== strandIndex) return s;
          const updatedCells = s.cells.map((c, ci) => (ci === index ? { beadId } : c));
          return { ...s, cells: updatedCells };
        });
        const newTimestamp = Date.now();
        const newDesign = { ...state.design, strands: updatedStrands, updatedAt: newTimestamp };

        saveToLocalStorage({ design: newDesign, palette: state.palette, inventory: state.inventory });
        return { design: newDesign, lastUpdate: newTimestamp };
      });
    },
    
    // Eliminado setFirstLineCell: ya no se requiere un camino especial

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
      
      // Si es actualización interna al mismo diseño, iniciar batch para agrupar
      try {
        const current = get().design;
        if (current && design && current.id === design.id) {
          get().beginHistoryBatch();
        }
      } catch {}

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
      try {
        const { design, history } = get();
        
        // Verificar que el diseño es válido antes de guardarlo
        if (!design || !Array.isArray(design.strands)) {
          console.error("[History] Error: Intentando guardar un diseño inválido en el historial");
          return;
        }
        
        console.log(`[History] Guardando en historial - hebras: ${design.strands.length}`);
        
        // Crear una copia profunda usando el método más seguro disponible
        let designCopy;
        try {
          if (typeof structuredClone === 'function') {
            designCopy = structuredClone(design);
          } else {
            designCopy = JSON.parse(JSON.stringify(design));
          }
        } catch (err) {
          console.error("[History] Error al clonar diseño:", err);
          designCopy = JSON.parse(JSON.stringify(design));
        }
        
        // Verificar que la copia mantenga la estructura
        if (!designCopy || !Array.isArray(designCopy.strands) || 
            designCopy.strands.length !== design.strands.length) {
          console.error("[History] Error: La copia del diseño es incorrecta");
          return;
        }
        
        // Actualizar el historial con seguridad
        set({
          history: [...history.slice(-19), designCopy],
          future: [],
        });
        
        console.log(`[History] Historial actualizado correctamente - ${history.length + 1} entradas`);
      } catch (error) {
        console.error("[History] Error en saveToHistory:", error);
      }
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
      try { get().beginHistoryBatch(); } catch {}
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
      try { get().beginHistoryBatch(); } catch {}
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
      try { get().beginHistoryBatch(); } catch {}
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
      try { get().beginHistoryBatch(); } catch {}
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
