import { create } from "zustand"
import type { TestCreationFormData } from "../types"

type TestCreationState = {
    formData: Partial<TestCreationFormData> | null
    editId: string | null
    testId: string | null          // ID of the test created/updated — survives clearFormData
    setFormData: (data: Partial<TestCreationFormData>, editId?: string) => void
    setTestId: (id: string) => void
    clearFormData: () => void      // clears form + editId but keeps testId
    clearAll: () => void           // full reset including testId
}

export const useTestCreationStore = create<TestCreationState>((set) => ({
    formData: null,
    editId: null,
    testId: null,
    setFormData: (data, editId) => set({ formData: data, editId: editId ?? null }),
    setTestId: (id) => set({ testId: id }),
    clearFormData: () => set({ formData: null, editId: null }),
    clearAll: () => set({ formData: null, editId: null, testId: null }),
}))
