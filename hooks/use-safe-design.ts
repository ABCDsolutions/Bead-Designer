'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '@/lib/store';
import type { Design, BeadSpec, InventoryItem } from '@/types/design';

/**
 * A hook that safely accesses design data from the store
 * and prevents hydration mismatches by returning placeholder
 * data during server-side rendering
 */
export function useSafeDesignData() {
  const [isHydrated, setIsHydrated] = useState(false);
  const design = useDesignStore(state => state.design);
  const palette = useDesignStore(state => state.palette);
  const inventory = useDesignStore(state => state.inventory);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return {
    isHydrated,
    // Only return real data on the client side to avoid hydration mismatches
    design: isHydrated ? design : { 
      name: "Cargando...",
      id: "loading",
      strands: [],
      symmetry: "none" as const,
      updatedAt: Date.now()
    },
    palette: isHydrated ? palette : {},
    inventory: isHydrated ? inventory : {}
  };
}
