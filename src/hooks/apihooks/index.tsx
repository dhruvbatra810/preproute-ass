import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiCalls } from "../../services";
import type { Test, Subject, Topic, SubTopic, ApiListResponse, TestCreationFormData } from "../../types";

export const useLoginApi = () => useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
        apiCalls.login(data.userId, data.password)
})

export const useGetTests = () => useQuery<{ success: boolean; data: Test[] }>({
    queryKey: ["tests"],
    queryFn: () => apiCalls.getTests(),
    staleTime: 0,
    refetchOnMount: true,
})

export const useGetTestById = (id: string) => useQuery<{ success: boolean; data: TestCreationFormData & { id: string } }>({
    queryKey: ["test", id],
    queryFn: () => apiCalls.getTestById(id),
    enabled: !!id,
    staleTime: Infinity,
})

export const useGetSubjects = () => useQuery<ApiListResponse<Subject>>({
    queryKey: ["subjects"],
    queryFn: () => apiCalls.getSubjects(),
    staleTime: Infinity,
})

export const useGetTopics = (subjectId: string) => useQuery<ApiListResponse<Topic>>({
    queryKey: ["topics", subjectId],
    queryFn: () => apiCalls.getTopics(subjectId),
    enabled: !!subjectId,
    staleTime: Infinity,
})

export const useGetSubTopics = (topicId: string) => useQuery<ApiListResponse<SubTopic>>({
    queryKey: ["subtopics", topicId],
    queryFn: () => apiCalls.getSubTopics(topicId),
    enabled: !!topicId,
    staleTime: Infinity,
})

export const useGetSubTopicsForTopics = (topicIds: string[]) => useQuery<ApiListResponse<SubTopic>>({
    queryKey: ["subtopics-multi", ...topicIds],
    queryFn: () => apiCalls.getSubTopicsForTopics(topicIds),
    enabled: topicIds.length > 0,
    staleTime: Infinity,
})

export const useCreateTest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: TestCreationFormData & { status: string }) =>
            apiCalls.createTest(payload as Record<string, unknown>),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tests"] }),
    })
}

export const useUpdateTest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...payload }: TestCreationFormData & { status: string; id: string }) =>
            apiCalls.updateTest(id, payload as Record<string, unknown>),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tests"] }),
    })
}

export const useCreateQuestions = () => useMutation({
    mutationFn: (payload: { questions: Record<string, unknown>[] }) =>
        apiCalls.createQuestions(payload),
})

type PublishPayload = { id: string; status: string; live_until?: string; publish_at?: string }

export const usePublishTest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...payload }: PublishPayload) =>
            apiCalls.updateTest(id, payload as Record<string, unknown>),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tests"] }),
    })
}

export const useDeleteTest = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => apiCalls.deleteTest(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tests"] }),
    })
}

export const useFetchBulkQuestions = () => useMutation({
    mutationFn: (questionIds: string[]) => apiCalls.fetchBulkQuestions(questionIds),
})
