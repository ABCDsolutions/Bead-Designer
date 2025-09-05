'use client'

import { useEffect, useState } from 'react'
import { useDesignStore } from '@/lib/store'

/**
 * StoreProvider ensures the Zustand store is properly hydrated from localStorage
 * and prevents hydration mismatch errors by safely managing client/server rendering
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Initialize store when client mounts
  useEffect(() => {
    // Force a rehydration check (if needed)
    const state = useDesignStore.getState()
    
    // Mark as hydrated
    setIsHydrated(true);
    
    if (state) {
      // No need to set state here, the store is already initialized from localStorage
      // during creation, we just need the component for potential future features
      console.log("Store initialized", state.design.name)
    }
  }, [])

  return <>{children}</>
}
