export type Test = {
    id: string
    name: string
    subject: string
    topics: string[]
    status: "draft" | "published" | "live" | "unpublished"
    created_at: string
    questions?: string[]
}

export type Subject = {
    id: string
    name: string
    created_at: string
    updated_at: string
}

export type Topic = {
    id: string
    subject_id: string
    name: string
    created_at: string
    updated_at: string
}

export type SubTopic = {
    id: string
    topic_id: string
    name: string
    created_at: string
    updated_at: string
}

export type ApiListResponse<T> = {
    status: "success"
    message: string
    data: T[]
}

export type QuestionFormData = {
    type: "mcq"
    question: string
    option1: string
    option2: string
    option3: string
    option4: string
    correct_option: "option1" | "option2" | "option3" | "option4"
    explanation: string
    difficulty: "easy" | "medium" | "difficult"
    topic?: string
    sub_topic?: string
    media_url?: string
}

export type TestCreationFormData = {
    name: string
    type: "chapterwise" | "pyq" | "mock"
    subject: string
    topics?: string[]
    sub_topics?: string[]
    correct_marks: number
    wrong_marks: number
    unattempt_marks: number
    difficulty: "easy" | "medium" | "difficult"
    total_time: number
    total_marks: number
    total_questions: number
    questions?: string[]   // existing question IDs returned by GET /tests/:id
}
