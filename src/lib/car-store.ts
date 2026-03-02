// src/lib/car-store.ts
// Zustand v5 — UI state only (selected car, panel visibility)
// DO NOT store CarRecord data here — Dexie is the source of truth for persistence
// See RESEARCH.md Pitfall 2: Zustand persist + IndexedDB race condition

import { create } from "zustand"

interface CarStore {
  selectedCarId: number | null
  isPanelOpen: boolean
  // Loading state for Phase 3 add-car flow
  isAddingCar: boolean
  addCarStep: "idle" | "fetching" | "analyzing" | "done" | "error"
  addCarError: string | null
  // Actions
  selectCar: (id: number | null) => void
  closePanel: () => void
  setAddingState: (step: CarStore["addCarStep"], error?: string | null) => void
  resetAddingState: () => void
}

export const useCarStore = create<CarStore>()((set) => ({
  selectedCarId: null,
  isPanelOpen: false,
  isAddingCar: false,
  addCarStep: "idle",
  addCarError: null,

  selectCar: (id) =>
    set({ selectedCarId: id, isPanelOpen: id !== null }),

  closePanel: () =>
    set({ selectedCarId: null, isPanelOpen: false }),

  setAddingState: (step, error = null) =>
    set({
      isAddingCar: step !== "idle" && step !== "done" && step !== "error",
      addCarStep: step,
      addCarError: error ?? null,
    }),

  resetAddingState: () =>
    set({ isAddingCar: false, addCarStep: "idle", addCarError: null }),
}))
