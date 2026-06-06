import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

class ApiCalls {
    async login(userId: string, password: string) {
        const res = await api.post("/auth/login", { userId, password });
        return res.data;
    }

    async getTests() {
        const res = await api.get("/tests");
        return res.data;
    }

    async getTestById(id: string) {
        const res = await api.get(`/tests/${id}`);
        return res.data;
    }

    async getSubjects() {
        const res = await api.get("/subjects");
        return res.data;
    }

    async getTopics(subjectId: string) {
        const res = await api.get(`/topics/subject/${subjectId}`);
        return res.data;
    }

    async getSubTopics(topicId: string) {
        const res = await api.get(`/sub-topics/topic/${topicId}`);
        return res.data;
    }

    async createTest(payload: Record<string, unknown>) {
        const res = await api.post("/tests", payload);
        return res.data;
    }

    async updateTest(id: string, payload: Record<string, unknown>) {
        const res = await api.put(`/tests/${id}`, payload);
        return res.data;
    }

    async createQuestions(payload: { questions: Record<string, unknown>[] }) {
        const res = await api.post("/questions/bulk", payload);
        return res.data;
    }

    async deleteTest(id: string) {
        const res = await api.delete(`/tests/${id}`);
        return res.data;
    }

    async getSubTopicsForTopics(topicIds: string[]) {
        const res = await api.post("/sub-topics/multi-topics", { topicIds });
        return res.data;
    }

    async fetchBulkQuestions(questionIds: string[]) {
        const res = await api.post("/questions/fetchBulk", { question_ids: questionIds });
        return res.data;
    }
}

export const apiCalls = new ApiCalls();
