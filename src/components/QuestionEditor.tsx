import { useState, useRef } from "react"
import { Trash2 } from "lucide-react"
import { useQuestionStore } from "../store/questionStore"
import { useGetTopics, useGetSubTopics } from "../hooks/apihooks"
import { useToast } from "./Toast"
import RichTextEditor from "./RichTextEditor"
import type { QuestionFormData } from "../types"
import styles from "./QuestionEditor.module.css"

const OPTION_KEYS = ["option1", "option2", "option3", "option4"] as const
type OptionKey = typeof OPTION_KEYS[number]

const hasText = (html?: string) => (html ?? "").replace(/<[^>]*>/g, "").trim().length > 0

// ── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSVRows(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ""
    let inQuotes = false
    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (ch === '"') {
            if (inQuotes && text[i + 1] === '"') { field += '"'; i++ }
            else inQuotes = !inQuotes
        } else if (ch === "," && !inQuotes) {
            row.push(field.trim()); field = ""
        } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
            if (ch === "\r" && text[i + 1] === "\n") i++
            row.push(field.trim())
            if (row.some((f) => f)) rows.push(row)
            row = []; field = ""
        } else {
            field += ch
        }
    }
    row.push(field.trim())
    if (row.some((f) => f)) rows.push(row)
    return rows
}

function toCorrectOption(val: string): "option1" | "option2" | "option3" | "option4" | undefined {
    const v = val.trim().toLowerCase()
    if (v === "1" || v === "a" || v === "option1") return "option1"
    if (v === "2" || v === "b" || v === "option2") return "option2"
    if (v === "3" || v === "c" || v === "option3") return "option3"
    if (v === "4" || v === "d" || v === "option4") return "option4"
    return undefined
}

function parseCSVToQuestions(text: string): Partial<QuestionFormData>[] {
    const rows = parseCSVRows(text)
    if (rows.length < 2) throw new Error("CSV must have a header row and at least one data row.")
    const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"))
    const col = (name: string) => header.indexOf(name)
    const REQUIRED = ["question", "option1", "option2", "option3", "option4", "correct_option"]
    const missing = REQUIRED.filter((f) => col(f) === -1)
    if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(", ")}`)
    const result: Partial<QuestionFormData>[] = []
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        const get = (name: string) => r[col(name)]?.trim() ?? ""
        const correct_option = toCorrectOption(get("correct_option"))
        if (!get("question") || !get("option1") || !get("option2") || !get("option3") || !get("option4") || !correct_option) continue
        const diff = get("difficulty")
        result.push({
            type: "mcq",
            question: get("question"),
            option1: get("option1"),
            option2: get("option2"),
            option3: get("option3"),
            option4: get("option4"),
            correct_option,
            explanation: get("explanation") || undefined,
            difficulty: (["easy", "medium", "difficult"].includes(diff) ? diff : undefined) as QuestionFormData["difficulty"] | undefined,
            topic: get("topic") || undefined,
            sub_topic: get("sub_topic") || undefined,
            media_url: get("media_url") || undefined,
        })
    }
    if (result.length === 0) throw new Error("No valid rows found. Ensure required fields are filled: question, option1–4, correct_option.")
    return result
}

const CSV_TEMPLATE = "question,option1,option2,option3,option4,correct_option,explanation,difficulty,topic,sub_topic,media_url\n"

export default function QuestionEditor() {
    const { questions, currentIndex, subjectId, setCurrentIndex, setQuestion, setQuestionsFromData, addQuestion, deleteQuestion } = useQuestionStore()
    const [showErrors, setShowErrors] = useState(false)
    const [mediaUrlError, setMediaUrlError] = useState("")
    const { toast } = useToast()
    const csvInputRef = useRef<HTMLInputElement>(null)

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const parsed = parseCSVToQuestions(ev.target?.result as string)
                const currentIsBlank = questions.length === 1 && !Object.keys(questions[0]).length
                const base = currentIsBlank ? [] : questions
                setQuestionsFromData([...base, ...parsed])
                setCurrentIndex(base.length)
                toast(`${parsed.length} question${parsed.length > 1 ? "s" : ""} imported from CSV.`, "success")
            } catch (err) {
                toast((err as Error).message ?? "Failed to parse CSV.", "error")
            }
        }
        reader.readAsText(file)
    }

    const downloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url; a.download = "questions_template.csv"; a.click()
        URL.revokeObjectURL(url)
    }

    const validateMediaUrl = (val: string) => {
        if (!val) { setMediaUrlError(""); return }
        try { new URL(val); setMediaUrlError("") }
        catch { setMediaUrlError("Please enter a valid URL (e.g. https://example.com/image.png)") }
    }

    const total = questions.length
    const q = questions[currentIndex] ?? {}

    const { data: topicsData } = useGetTopics(subjectId)
    // q.topic stores the name; resolve back to ID to drive the sub-topics query
    const selectedTopicId = (topicsData?.data ?? []).find((t) => t.name === q.topic)?.id ?? ""
    const { data: subTopicsData } = useGetSubTopics(selectedTopicId)

    const topics = topicsData?.data ?? []
    const subTopics = subTopicsData?.data ?? []

    const patch = (data: Parameters<typeof setQuestion>[1]) => setQuestion(currentIndex, data)

    const clearQuestion = () =>
        setQuestion(currentIndex, {
            question: "", option1: "", option2: "", option3: "", option4: "",
            explanation: "", correct_option: undefined, difficulty: undefined,
            topic: undefined, sub_topic: undefined, media_url: undefined,
        })

    const questionValid = hasText(q.question)
    const opt1Valid = (q.option1 ?? "").trim().length > 0
    const opt2Valid = (q.option2 ?? "").trim().length > 0
    const opt3Valid = (q.option3 ?? "").trim().length > 0
    const opt4Valid = (q.option4 ?? "").trim().length > 0
    const correctValid = !!q.correct_option

    const isValid = questionValid && opt1Valid && opt2Valid && opt3Valid && opt4Valid && correctValid

    const handleAddQuestion = () => {
        if (!isValid) {
            setShowErrors(true)
            return
        }
        setShowErrors(false)
        addQuestion()
    }

    const optionValid = (key: OptionKey) => {
        const map = { option1: opt1Valid, option2: opt2Valid, option3: opt3Valid, option4: opt4Valid }
        return map[key]
    }

    return (
        <div className={styles.editor}>
            {/* Header */}
            <div className={styles.header}>
                <span className={styles.questionCount}>
                    Question <strong>{currentIndex + 1}</strong>/{total}
                </span>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.mcqChip}
                        onClick={handleAddQuestion}
                        title={!isValid ? "Fill question, all 4 options, and select correct answer first" : "Add new question"}
                    >
                        + MCQ
                    </button>
                    <button
                        type="button"
                        className={styles.csvChip}
                        onClick={() => csvInputRef.current?.click()}
                        title="Import questions from a CSV file"
                    >
                        + CSV
                    </button>
                    <button
                        type="button"
                        className={styles.templateLink}
                        onClick={downloadTemplate}
                        title="Download CSV template"
                    >
                        template
                    </button>
                    <input
                        ref={csvInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        style={{ display: "none" }}
                        onChange={handleCSVUpload}
                    />
                    <button
                        type="button"
                        className={styles.deleteAll}
                        onClick={clearQuestion}
                    >
                        <Trash2 size={13} /> Clear Fields
                    </button>
                    {total > 1 && (
                        <button
                            type="button"
                            className={styles.deleteQuestion}
                            onClick={() => deleteQuestion(currentIndex)}
                            title="Remove this question"
                        >
                            <Trash2 size={13} /> Remove Question
                        </button>
                    )}
                </div>
            </div>

            {/* Question body */}
            <div className={styles.section}>
                <div className={`${styles.fieldWrapper} ${showErrors && !questionValid ? styles.hasError : ""}`}>
                    <RichTextEditor
                        value={q.question ?? ""}
                        onChange={(v) => patch({ question: v })}
                        placeholder="Type the question here…"
                    />
                    {showErrors && !questionValid && (
                        <span className={styles.errorText}>Question text is required</span>
                    )}
                </div>
            </div>

            {/* Media URL */}
            <div className={styles.section}>
                <p className={styles.sectionLabel}>Media URL <span className={styles.optional}>(optional)</span></p>
                <input
                    type="url"
                    className={`${styles.mediaInput} ${mediaUrlError ? styles.mediaInputError : ""}`}
                    placeholder="https://… (image or video link)"
                    value={q.media_url ?? ""}
                    onChange={(e) => {
                        patch({ media_url: e.target.value || undefined })
                        if (mediaUrlError) validateMediaUrl(e.target.value)
                    }}
                    onBlur={(e) => validateMediaUrl(e.target.value)}
                />
                {mediaUrlError && <span className={styles.errorText}>{mediaUrlError}</span>}
            </div>

            {/* Options */}
            <div className={styles.section}>
                <p className={styles.sectionLabel}>
                    Type the options below
                    {showErrors && !correctValid && (
                        <span className={styles.errorText}> — select the correct answer</span>
                    )}
                </p>
                {OPTION_KEYS.map((key, idx) => (
                    <div
                        key={key}
                        className={`${styles.optionRow} ${showErrors && !optionValid(key) ? styles.optionError : ""}`}
                    >
                        <input
                            type="radio"
                            name={`correct_${currentIndex}`}
                            checked={q.correct_option === key}
                            onChange={() => patch({ correct_option: key })}
                            className={styles.optionRadio}
                        />
                        <input
                            type="text"
                            className={styles.optionInput}
                            placeholder={`Option ${idx + 1}`}
                            value={(q[key] as string) ?? ""}
                            onChange={(e) => patch({ [key]: e.target.value })}
                        />
                        <button
                            type="button"
                            className={styles.optionDelete}
                            onClick={() =>
                                patch({ [key]: "", ...(q.correct_option === key ? { correct_option: undefined } : {}) })
                            }
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {showErrors && !correctValid && (
                    <span className={styles.errorText}>Please select the correct answer</span>
                )}
            </div>

            {/* Solution */}
            <div className={styles.section}>
                <p className={styles.sectionLabel}>
                    Add Solution <span className={styles.optional}>(optional)</span>
                </p>
                <RichTextEditor
                    value={q.explanation ?? ""}
                    onChange={(v) => patch({ explanation: v })}
                    placeholder="Type solution/explanation here…"
                />
            </div>

            {/* Navigation arrows */}
            <div className={styles.navArrows}>
                <button
                    type="button"
                    className={styles.arrowBtn}
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                >
                    ‹
                </button>
                <button
                    type="button"
                    className={styles.arrowBtn}
                    disabled={currentIndex === total - 1}
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                >
                    ›
                </button>
            </div>

            {/* Question settings */}
            <div className={styles.settings}>
                <div className={styles.settingField}>
                    <label>Level of Difficulty <span className={styles.optional}>(optional)</span></label>
                    <select
                        value={q.difficulty ?? ""}
                        onChange={(e) => patch({ difficulty: e.target.value as "easy" | "medium" | "difficult" || undefined })}
                    >
                        <option value="">Select from Drop-down</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="difficult">Difficult</option>
                    </select>
                </div>
                <div className={styles.settingField}>
                    <label>Topic <span className={styles.optional}>(optional)</span></label>
                    <select
                        value={selectedTopicId}
                        onChange={(e) => {
                            const name = topics.find((t) => t.id === e.target.value)?.name
                            patch({ topic: name ?? undefined, sub_topic: undefined })
                        }}
                        disabled={topics.length === 0}
                    >
                        <option value="">Select from Drop-down</option>
                        {topics.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.settingField}>
                    <label>Sub-topic <span className={styles.optional}>(optional)</span></label>
                    <select
                        value={subTopics.find((st) => st.name === q.sub_topic)?.id ?? ""}
                        onChange={(e) => {
                            const name = subTopics.find((st) => st.id === e.target.value)?.name
                            patch({ sub_topic: name ?? undefined })
                        }}
                        disabled={!q.topic || subTopics.length === 0}
                    >
                        <option value="">Select from Drop-down</option>
                        {subTopics.map((st) => (
                            <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
}
