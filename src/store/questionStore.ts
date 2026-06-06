import { create } from "zustand"
import type { QuestionFormData } from "../types"

type QuestionState = {
    questions: Partial<QuestionFormData>[]
    testId: string | null
    subject: string
    subjectId: string
    currentIndex: number
    pendingQuestionIds: string[]   // existing IDs to fetch when editing a test
    initQuestions: (count: number, testId: string, subject: string, subjectId: string, pendingIds?: string[]) => void
    setCurrentIndex: (i: number) => void
    setQuestion: (i: number, data: Partial<QuestionFormData>) => void
    setQuestionsFromData: (data: Partial<QuestionFormData>[]) => void
    clearPendingIds: () => void
    addQuestion: () => void
    deleteQuestion: (i: number) => void
    clearQuestions: () => void
}

export const useQuestionStore = create<QuestionState>((set) => ({
    questions: [],
    testId: null,
    subject: "",
    subjectId: "",
    currentIndex: 0,
    pendingQuestionIds: [],
    initQuestions: (count, testId, subject, subjectId, pendingIds = []) =>
        set({
            questions: Array.from({ length: count }, () => ({})),
            testId, subject, subjectId, currentIndex: 0,
            pendingQuestionIds: pendingIds,
        }),
    setCurrentIndex: (i) => set({ currentIndex: i }),
    setQuestion: (i, data) =>
        set((state) => {
            const updated = [...state.questions]
            updated[i] = { ...updated[i], ...data }
            return { questions: updated }
        }),
    setQuestionsFromData: (data) => set({ questions: data, currentIndex: 0 }),
    clearPendingIds: () => set({ pendingQuestionIds: [] }),
    addQuestion: () =>
        set((state) => ({
            questions: [...state.questions, {}],
            currentIndex: state.questions.length,
        })),
    deleteQuestion: (i) =>
        set((state) => {
            if (state.questions.length <= 1) return state
            const updated = state.questions.filter((_, idx) => idx !== i)
            const newIndex = Math.min(state.currentIndex, updated.length - 1)
            return { questions: updated, currentIndex: newIndex }
        }),
    clearQuestions: () => set({
        questions: [], testId: null, subject: "", subjectId: "",
        currentIndex: 0, pendingQuestionIds: [],
    }),
}))
