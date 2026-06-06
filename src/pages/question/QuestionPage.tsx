import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Trash2 } from "lucide-react"
import { useQuestionStore } from "../../store/questionStore"
import { useTestCreationStore } from "../../store/testCreationStore"
import { useCreateQuestions, useFetchBulkQuestions } from "../../hooks/apihooks"
import { useToast } from "../../components/Toast"
import QuestionEditor from "../../components/QuestionEditor"
import PublishOverlay from "../../components/PublishOverlay"
import styles from "./QuestionPage.module.css"

const hasText = (html?: string) => (html ?? "").replace(/<[^>]*>/g, "").trim().length > 0

const isQuestionComplete = (q: Record<string, unknown>) =>
    hasText(q.question as string) &&
    (q.option1 as string ?? "").trim().length > 0 &&
    (q.option2 as string ?? "").trim().length > 0 &&
    (q.option3 as string ?? "").trim().length > 0 &&
    (q.option4 as string ?? "").trim().length > 0 &&
    !!q.correct_option

export default function QuestionPage() {
    const navigate = useNavigate()
    const { questions, testId: storeTestId, subject, currentIndex, setCurrentIndex, clearQuestions, addQuestion, deleteQuestion, pendingQuestionIds, setQuestionsFromData, clearPendingIds } = useQuestionStore()
    const { formData, testId: savedTestId, setFormData, clearAll } = useTestCreationStore()
    const testId = storeTestId || savedTestId
    const { mutate: createQuestions, isPending } = useCreateQuestions()
    const { mutate: fetchBulk } = useFetchBulkQuestions()
    const { toast } = useToast()
    const [showPublish, setShowPublish] = useState(false)

    // On mount: if editing an existing test, fetch its saved questions
    useEffect(() => {
        if (pendingQuestionIds.length > 0) {
            fetchBulk(pendingQuestionIds, {
                onSuccess: (res: { data?: Record<string, unknown>[] }) => {
                    const fetched = (res?.data ?? []).map((q) => ({
                        question: q.question as string ?? "",
                        option1: q.option1 as string ?? "",
                        option2: q.option2 as string ?? "",
                        option3: q.option3 as string ?? "",
                        option4: q.option4 as string ?? "",
                        correct_option: q.correct_option as "option1" | "option2" | "option3" | "option4",
                        explanation: q.explanation as string ?? "",
                        difficulty: q.difficulty as "easy" | "medium" | "difficult" | undefined,
                        topic: q.topic as string | undefined,
                        sub_topic: q.sub_topic as string | undefined,
                        media_url: q.media_url as string | undefined,
                        type: "mcq" as const,
                    }))
                    if (fetched.length > 0) setQuestionsFromData(fetched)
                    clearPendingIds()
                },
                onError: () => clearPendingIds(),
            })
        } else if (questions.length === 0) {
            addQuestion()
        }
    }, [])

    const total = questions.length

    const handleExit = () => {
        clearQuestions()
        clearAll()
        navigate("/dashboard")
    }

    const handleDeleteQuestion = (i: number) => {
        if (total <= 1) {
            toast("At least one question is required.", "error")
            return
        }
        deleteQuestion(i)
    }

    const handleNext = () => {
        if (!testId) {
            toast("Test ID is missing — go back and recreate the test.", "error")
            return
        }

        const incompleteIndex = questions.findIndex((q) => !isQuestionComplete(q as Record<string, unknown>))
        if (incompleteIndex !== -1) {
            setCurrentIndex(incompleteIndex)
            toast(`Question ${incompleteIndex + 1} is incomplete. Please fill question text, all 4 options, and select the correct answer.`, "error")
            return
        }

        const payload = questions.map((q) => ({
            ...q,
            type: "mcq",
            subject,
            test_id: testId,
        }))
        createQuestions(
            { questions: payload as Record<string, unknown>[] },
            {
                onSuccess: () => {
                    toast("Questions saved successfully!", "success")
                    setShowPublish(true)
                },
                onError: (err: unknown) => {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    toast(msg ?? "Failed to save questions. Please try again.", "error")
                },
            }
        )
    }

    const handlePublishDone = () => {
        clearQuestions()
        clearAll()
        navigate("/dashboard")
    }

    const handleEditTest = () => {
        setFormData(formData ?? {}, testId ?? "")
        navigate("/test-creation")
    }

    const testType = formData?.type ?? "chapterwise"
    const typeLabel: Record<string, string> = {
        chapterwise: "Chapter Wise",
        pyq: "PYQ",
        mock: "Mock Test",
    }

    return (
        <div className={styles.page}>
            {/* Top bar */}
            <div className={styles.topBar}>
                <div className={styles.breadcrumb}>
                    Test Creation <span>/</span> Create Test <span>/</span> {typeLabel[testType]}
                </div>
                <button className={styles.publishBtn} disabled>
                    Publish
                </button>
            </div>

            {/* Test info bar */}
            <div className={styles.infoBar}>
                <div className={styles.infoLeft}>
                    <span className={styles.typeBadge}>{typeLabel[testType]}</span>
                    {formData?.difficulty && (
                        <span className={`${styles.diffBadge} ${styles[formData.difficulty]}`}>
                            {formData.difficulty.charAt(0).toUpperCase() + formData.difficulty.slice(1)}
                        </span>
                    )}
                    {subject && <span className={styles.metaItem}>Subject: <strong>{subject}</strong></span>}
                </div>
                <div className={styles.infoRight}>
                    {formData?.total_time && <span className={styles.statItem}>{formData.total_time} Min</span>}
                    {formData?.total_questions && <span className={styles.statItem}>{formData.total_questions} Q's</span>}
                    {formData?.total_marks && <span className={styles.statItem}>{formData.total_marks} Marks</span>}
                </div>
            </div>

            {/* Main body */}
            <div className={styles.body}>
                {/* Left sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <span className={styles.sidebarTitle}>Question creation</span>
                    </div>
                    <p className={styles.totalLabel}>Total Questions: {total}</p>
                    <ul className={styles.questionList}>
                        {questions.map((q, i) => {
                            const complete = isQuestionComplete(q as Record<string, unknown>)
                            return (
                                <li
                                    key={i}
                                    className={`${styles.questionItem} ${i === currentIndex ? styles.activeItem : ""}`}
                                    onClick={() => { setCurrentIndex(i); if (showPublish) setShowPublish(false); }}
                                >
                                    <span className={`${styles.dot} ${complete ? styles.dotFilled : ""}`} />
                                    <span className={styles.questionLabel}>Question {i + 1}</span>
                                    {i === currentIndex && !showPublish && <span className={styles.activeArrow}>›</span>}
                                    {total > 1 && !showPublish && (
                                        <button
                                            type="button"
                                            className={styles.sidebarDeleteBtn}
                                            title="Remove question"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteQuestion(i)
                                            }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </aside>

                {/* Right content area */}
                <main className={styles.content}>
                    {showPublish ? (
                        <PublishOverlay
                            testId={testId ?? ""}
                            onCancel={handlePublishDone}
                            onConfirm={handlePublishDone}
                            onEditTest={handleEditTest}
                        />
                    ) : (
                        <>
                            <QuestionEditor />

                            {/* Footer */}
                            <div className={styles.footer}>
                                <button type="button" className={styles.exitBtn} onClick={handleExit}>
                                    Exit Test Creation
                                </button>
                                <button
                                    type="button"
                                    className={styles.nextBtn}
                                    disabled={isPending}
                                    onClick={handleNext}
                                >
                                    {isPending ? "Saving…" : "Save & Continue"}
                                </button>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
