import { useState, useMemo } from "react"
import { Pencil, Clock, FileText, TrendingUp, Calendar, ChevronDown } from "lucide-react"
import { useTestCreationStore } from "../store/testCreationStore"
import { useQuestionStore } from "../store/questionStore"
import { usePublishTest, useGetTopics, useGetSubTopicsForTopics } from "../hooks/apihooks"
import { useToast } from "./Toast"
import styles from "./PublishOverlay.module.css"

type Props = {
    testId: string
    onCancel: () => void
    onConfirm: () => void
    onEditTest: () => void
}

const TYPE_LABELS: Record<string, string> = {
    chapterwise: "Chapter Wise",
    pyq: "PYQ",
    mock: "Mock Test",
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, "0")
    const m = i % 2 === 0 ? "00" : "30"
    return `${h}:${m}`
})

function addDays(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString()
}

const DURATION_OPTIONS = [
    { value: "always", label: "Always Available" },
    { value: "1w",     label: "1 Week" },
    { value: "2w",     label: "2 Weeks" },
    { value: "3w",     label: "3 Weeks" },
    { value: "1m",     label: "1 Month" },
    { value: "custom", label: "Custom Duration" },
]

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim()


function computeLiveUntil(liveDuration: string, customEndDate: string, customEndTime: string): string | undefined {
    if (liveDuration === "always") return undefined
    if (liveDuration === "1w") return addDays(7)
    if (liveDuration === "2w") return addDays(14)
    if (liveDuration === "3w") return addDays(21)
    if (liveDuration === "1m") return addDays(30)
    if (customEndDate && customEndTime) return new Date(`${customEndDate}T${customEndTime}`).toISOString()
    return undefined
}

export default function PublishOverlay({ testId, onCancel, onConfirm, onEditTest }: Props) {
    const { formData } = useTestCreationStore()
    const { subject, subjectId, questions } = useQuestionStore()
    const { mutate: publishTest, isPending } = usePublishTest()
    const { toast } = useToast()

    const [showQuestions, setShowQuestions] = useState(false)
    const [activeTab, setActiveTab] = useState<"now" | "schedule">("now")
    const [liveDuration, setLiveDuration] = useState("always")
    const [customEndDate, setCustomEndDate] = useState("")
    const [customEndTime, setCustomEndTime] = useState("")
    const [scheduleDate, setScheduleDate] = useState("")
    const [scheduleTime, setScheduleTime] = useState("")

    const { data: topicsData } = useGetTopics(subjectId ?? "")
    const topicsList = topicsData?.data ?? []
    const { data: subTopicsData } = useGetSubTopicsForTopics(formData?.topics ?? [])
    const subTopicsList = subTopicsData?.data ?? []

    const resolvedTopics = (formData?.topics ?? []).map(
        (id) => topicsList.find((t) => t.id === id)?.name ?? id
    )
    const resolvedSubTopics = (formData?.sub_topics ?? []).map(
        (id) => subTopicsList.find((s) => s.id === id)?.name ?? id
    )

    const total = questions.length
    const diffLevel = formData?.difficulty

    const questionPreviews = useMemo(() =>
        questions.map((q) => ({
            text: stripHtml(q.question ?? ""),
            options: [
                { key: "option1", label: "A", text: q.option1 ?? "" },
                { key: "option2", label: "B", text: q.option2 ?? "" },
                { key: "option3", label: "C", text: q.option3 ?? "" },
                { key: "option4", label: "D", text: q.option4 ?? "" },
            ],
            correct: q.correct_option,
        })),
    [questions])

    const handleConfirm = () => {
        const live_until = computeLiveUntil(liveDuration, customEndDate, customEndTime)

        if (liveDuration === "custom" && !live_until) {
            toast("Please select a custom end date and time.", "error")
            return
        }

        let payload: { status: string; live_until?: string; publish_at?: string }

        if (activeTab === "now") {
            payload = { status: "live", ...(live_until ? { live_until } : {}) }
        } else {
            if (!scheduleDate || !scheduleTime) {
                toast("Please select a publish date and time.", "error")
                return
            }
            payload = {
                status: "scheduled",
                publish_at: new Date(`${scheduleDate}T${scheduleTime}`).toISOString(),
                ...(live_until ? { live_until } : {}),
            }
        }

        publishTest(
            { id: testId, ...payload },
            {
                onSuccess: onConfirm,
                onError: (err: unknown) => {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    toast(msg ?? "Failed to publish test. Please try again.", "error")
                },
            }
        )
    }

    const LiveUntilSection = (
        <div className={styles.section}>
            <p className={styles.sectionTitle}>Live Until</p>
            <p className={styles.sectionDesc}>Choose how long this test should remain available on the platform.</p>
            <div className={styles.radioGrid}>
                {DURATION_OPTIONS.map(({ value, label }) => (
                    <label key={value} className={styles.radioLabel}>
                        <input
                            type="radio"
                            name="liveDuration"
                            value={value}
                            checked={liveDuration === value}
                            onChange={() => setLiveDuration(value)}
                        />
                        <span>{label}</span>
                    </label>
                ))}
            </div>

            {liveDuration === "custom" && (
                <div className={styles.dateRow}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="date"
                            className={styles.dateInput}
                            value={customEndDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            placeholder="Select End Date"
                        />
                        <Calendar size={16} className={styles.inputIcon} />
                    </div>
                    <div className={styles.inputWrapper}>
                        <select
                            className={styles.timeSelect}
                            value={customEndTime}
                            onChange={(e) => setCustomEndTime(e.target.value)}
                        >
                            <option value="">Select End Time</option>
                            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown size={16} className={styles.inputIcon} />
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <div className={styles.overlay}>
            {/* Header */}
            <div className={styles.header}>
                <span className={styles.headerTitle}>Test created</span>
                <span className={styles.doneBadge}>
                    <span className={styles.checkCircle}>✓</span>
                    All {total} Questions done
                </span>
            </div>

            {/* Test summary card */}
            <div className={styles.card}>
                <div className={styles.cardTopRow}>
                    <span className={styles.typeBadge}>{TYPE_LABELS[formData?.type ?? "chapterwise"]}</span>
                    <button type="button" className={styles.editBtn} onClick={onEditTest}>
                        <Pencil size={14} />
                    </button>
                </div>

                <div className={styles.cardBody}>
                    <div className={styles.cardLeft}>
                        <div className={styles.cardTitleRow}>
                            <span className={styles.bookIcon}>📚</span>
                            <span className={styles.testName}>{formData?.name ?? "—"}</span>
                            {diffLevel && (
                                <span className={`${styles.diffBadge} ${styles[diffLevel]}`}>
                                    {diffLevel.charAt(0).toUpperCase() + diffLevel.slice(1)}
                                </span>
                            )}
                        </div>

                        <div className={styles.metaRow}>
                            <span className={styles.metaKey}>Subject</span>
                            <span className={styles.metaSep}>:</span>
                            <span className={styles.metaText}>{subject || "—"}</span>
                        </div>

                        {resolvedTopics.length > 0 && (
                            <div className={styles.metaRow}>
                                <span className={styles.metaKey}>Topic</span>
                                <span className={styles.metaSep}>:</span>
                                <div className={styles.chips}>
                                    {resolvedTopics.map((t, i) => (
                                        <span key={i} className={styles.chip}>{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {resolvedSubTopics.length > 0 && (
                            <div className={styles.metaRow}>
                                <span className={styles.metaKey}>Sub Topic</span>
                                <span className={styles.metaSep}>:</span>
                                <div className={styles.chips}>
                                    {resolvedSubTopics.map((st, i) => (
                                        <span key={i} className={styles.chip}>{st}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.cardRight}>
                        {formData?.total_time && (
                            <span className={styles.stat}><Clock size={13} /> {formData.total_time} Min</span>
                        )}
                        {formData?.total_questions && (
                            <span className={styles.stat}><FileText size={13} /> {formData.total_questions} Q's</span>
                        )}
                        {formData?.total_marks && (
                            <span className={styles.stat}><TrendingUp size={13} /> {formData.total_marks} Marks</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Questions preview accordion */}
            <div className={styles.accordion}>
                <button
                    type="button"
                    className={styles.accordionToggle}
                    onClick={() => setShowQuestions((v) => !v)}
                >
                    <span>View {total} Question{total !== 1 ? "s" : ""}</span>
                    <span className={`${styles.accordionArrow} ${showQuestions ? styles.accordionArrowOpen : ""}`}>▾</span>
                </button>

                {showQuestions && (
                    <div className={styles.questionsList}>
                        {questionPreviews.map((q, i) => (
                            <div key={i} className={styles.questionItem}>
                                <p className={styles.questionText}>
                                    <span className={styles.questionNum}>Q{i + 1}.</span> {q.text || <em>No question text</em>}
                                </p>
                                <div className={styles.optionsList}>
                                    {q.options.map((opt) => (
                                        <div
                                            key={opt.key}
                                            className={`${styles.optionRow} ${q.correct === opt.key ? styles.correctOption : ""}`}
                                        >
                                            <span className={styles.optionLabel}>{opt.label}</span>
                                            <span className={styles.optionText}>{opt.text || "—"}</span>
                                            {q.correct === opt.key && <span className={styles.correctTick}>✓</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    type="button"
                    className={`${styles.tab} ${activeTab === "now" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("now")}
                >
                    Publish Now
                </button>
                <button
                    type="button"
                    className={`${styles.tab} ${activeTab === "schedule" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("schedule")}
                >
                    Schedule Publish
                </button>
            </div>

            {/* Tab content */}
            <div className={styles.tabContent}>
                {activeTab === "schedule" && (
                    <div className={styles.section}>
                        <p className={styles.sectionTitle}>Select Date and Time</p>
                        <div className={styles.dateRow}>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="date"
                                    className={styles.dateInput}
                                    value={scheduleDate}
                                    min={new Date().toISOString().split("T")[0]}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    placeholder="Select Date"
                                />
                                <Calendar size={16} className={styles.inputIcon} />
                            </div>
                            <div className={styles.inputWrapper}>
                                <select
                                    className={styles.timeSelect}
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                >
                                    <option value="">Select Time</option>
                                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={16} className={styles.inputIcon} />
                            </div>
                        </div>
                    </div>
                )}

                {LiveUntilSection}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={isPending}>
                    Cancel
                </button>
                <button type="button" className={styles.confirmBtn} disabled={isPending} onClick={handleConfirm}>
                    {isPending ? "Publishing…" : "Confirm"}
                </button>
            </div>
        </div>
    )
}
