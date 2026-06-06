import { useEffect, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { useGetSubjects, useGetTopics, useGetSubTopicsForTopics, useCreateTest, useUpdateTest, useGetTestById } from "../../hooks/apihooks"
import { useTestCreationStore } from "../../store/testCreationStore"
import { useQuestionStore } from "../../store/questionStore"
import { useToast } from "../../components/Toast"
import MultiSelect from "../../components/MultiSelect"
import type { TestCreationFormData } from "../../types"
import styles from "./TestCreationPage.module.css"

const schema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    type: z.enum(["chapterwise", "pyq", "mock"]),
    subject: z.string().min(1, "Subject is required"),
    topics: z.array(z.string()).optional().default([]),
    sub_topics: z.array(z.string()).optional().default([]),
    difficulty: z.enum(["easy", "medium", "difficult"]),
    total_time: z.coerce.number().min(1, "Duration must be at least 1 minute"),
    total_marks: z.coerce.number().min(1, "Total marks required"),
    total_questions: z.coerce.number().min(1, "No. of questions required"),
    correct_marks: z.coerce.number(),
    wrong_marks: z.coerce.number(),
    unattempt_marks: z.coerce.number(),
})

const TAB_LABELS: { value: TestCreationFormData["type"]; label: string }[] = [
    { value: "chapterwise", label: "Chapter Wise" },
    { value: "pyq", label: "PYQ" },
    { value: "mock", label: "Mock Test" },
]

export default function TestCreationPage() {
    const navigate = useNavigate()
    const { formData, editId, setFormData, setTestId, clearFormData } = useTestCreationStore()
    const { initQuestions } = useQuestionStore()
    const { mutate: createTest, isPending: isCreating } = useCreateTest()
    const { mutate: updateTest, isPending: isUpdating } = useUpdateTest()
    const { toast } = useToast()
    const isPending = isCreating || isUpdating
    const { data: testByIdData } = useGetTestById(editId ?? "")

    const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<TestCreationFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            type: "chapterwise",
            difficulty: "easy",
            topics: [],
            sub_topics: [],
            correct_marks: 5,
            wrong_marks: -1,
            unattempt_marks: 0,
        },
    })

    // Tracks which editId has been fully prefilled to prevent re-applying on user changes
    const prefillRef = useRef<string | null>(null)

    const selectedSubject = watch("subject")
    const selectedTopics = watch("topics")
    const selectedType = watch("type")

    const { data: subjectsData } = useGetSubjects()
    const { data: topicsData } = useGetTopics(selectedSubject ?? "")
    const { data: subTopicsData } = useGetSubTopicsForTopics(selectedTopics ?? [])

    const subjects = subjectsData?.data ?? []
    const topics = topicsData?.data ?? []
    const subTopics = subTopicsData?.data ?? []

    const rawEditData = testByIdData?.data as TestCreationFormData | undefined

    // Step 1 — resolve subject name → UUID and reset form (clears topics/sub_topics)
    useEffect(() => {
        if (!editId || !rawEditData || subjects.length === 0) return
        const subjectId =
            subjects.find(s => s.id === rawEditData.subject)?.id ??
            subjects.find(s => s.name === rawEditData.subject)?.id ??
            rawEditData.subject
        prefillRef.current = null  // allow steps 2 & 3 to run for this edit
        reset({ ...rawEditData, subject: subjectId, topics: [], sub_topics: [] })
    }, [rawEditData, subjects])

    // Step 2 — resolve topic names → UUIDs once topics for the subject are loaded
    useEffect(() => {
        if (prefillRef.current === editId || !editId || !rawEditData || topics.length === 0) return
        const rawTopics = rawEditData.topics ?? []
        if (!rawTopics.length) return
        const resolved = rawTopics
            .map(t => topics.find(top => top.id === t || top.name === t)?.id ?? t)
            .filter(Boolean)
        setValue("topics", resolved)
    }, [rawEditData, topics])

    // Step 3 — resolve sub-topic names → UUIDs once sub-topics are loaded, then mark done
    useEffect(() => {
        if (prefillRef.current === editId || !editId || !rawEditData) return
        const rawSubTopics = rawEditData.sub_topics ?? []
        if (rawSubTopics.length === 0) {
            prefillRef.current = editId  // no sub-topics to resolve, prefill complete
            return
        }
        if (subTopics.length === 0) return  // wait for sub-topics to load
        const resolved = rawSubTopics
            .map(st => subTopics.find(s => s.id === st || s.name === st)?.id ?? st)
            .filter(Boolean)
        setValue("sub_topics", resolved)
        prefillRef.current = editId  // prefill complete
    }, [rawEditData, subTopics])

    // pre-fill from store if no editId (mid-form navigation)
    useEffect(() => {
        if (!editId && formData) reset(formData as TestCreationFormData)
    }, [])

    const persist = (data: TestCreationFormData) => setFormData(data, editId ?? undefined)

    const submitWithStatus = (status: "draft" | "unpublished") => {
        handleSubmit((data) => {
            persist(data)
            const onSuccess = (response: Record<string, unknown>) => {
                if (status === "draft") {
                    clearFormData()
                    navigate("/dashboard")
                    return
                }

                // Edit: ID is already known. Create: search every plausible path.
                let testId: string
                if (editId) {
                    testId = editId
                } else {
                    const d = response?.data as Record<string, unknown> | undefined
                    // Try every common API response shape
                    testId = (
                        d?.id ??
                        d?.test_id ??
                        (d?.test as Record<string, unknown> | undefined)?.id ??
                        (Array.isArray(d) ? (d[0] as Record<string, unknown>)?.id : undefined) ??
                        response?.id ??
                        response?.test_id
                    ) as string ?? ""
                }

                if (!testId) {
                    toast("Could not get test ID from the server. Check console for the API response shape.", "error")
                    return
                }

                // Persist testId in both stores so QuestionPage always has it
                setTestId(testId)
                const subjectName = subjects.find(s => s.id === data.subject)?.name ?? data.subject ?? ""
                if (editId) {
                    // When editing: load the actual existing questions, not empty slots
                    const existingIds = (rawEditData?.questions ?? []) as string[]
                    const count = existingIds.length > 0 ? existingIds.length : 1
                    initQuestions(count, testId, subjectName, data.subject ?? "", existingIds)
                } else {
                    initQuestions(data.total_questions, testId, subjectName, data.subject ?? "")
                }
                navigate("/question")
            }
            const onError = (err: unknown) => {
                const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                toast(msg ?? "Failed to save test. Please try again.", "error")
            }

            if (editId) {
                updateTest({ ...data, status, id: editId }, { onSuccess, onError })
            } else {
                createTest({ ...data, status }, { onSuccess, onError })
            }
        })()
    }

    const handleCancel = () => {
        clearFormData()
        navigate("/dashboard")
    }

    const breadcrumbTab = TAB_LABELS.find((t) => t.value === selectedType)?.label ?? "Chapter Wise"

    return (
        <div className={styles.page}>
            <div className={styles.breadcrumb}>
                Test Creation <span>/</span> Create Test <span>/</span> {breadcrumbTab}
            </div>

            <div className={styles.tabs}>
                {TAB_LABELS.map(({ value, label }) => (
                    <button
                        key={value}
                        type="button"
                        className={`${styles.tab} ${selectedType === value ? styles.activeTab : ""}`}
                        onClick={() => setValue("type", value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <form className={styles.form}>
                {/* Row 1: Subject + Name */}
                <div className={styles.grid2}>
                    <div className={styles.field}>
                        <label>Subject</label>
                        <div className={styles.selectWrapper}>
                            <Controller
                                control={control}
                                name="subject"
                                render={({ field }) => (
                                    <select
                                        value={field.value ?? ""}
                                        onChange={(e) => {
                                            field.onChange(e.target.value)
                                            setValue("topics", [])
                                            setValue("sub_topics", [])
                                        }}
                                    >
                                        <option value="">Choose from Drop-down</option>
                                        {subjects.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                )}
                            />
                            <ChevronDown size={16} className={styles.selectChevron} />
                        </div>
                        {errors.subject && <span className={styles.errorMsg}>{errors.subject.message}</span>}
                    </div>

                    <div className={styles.field}>
                        <label>Name of Test</label>
                        <input placeholder="Enter name of Test" {...register("name")} />
                        {errors.name && <span className={styles.errorMsg}>{errors.name.message}</span>}
                    </div>
                </div>

                {/* Row 2: Topic + Sub Topic */}
                <div className={styles.grid2}>
                    <div className={styles.field}>
                        <label>Topic</label>
                        <Controller
                            control={control}
                            name="topics"
                            render={({ field }) => (
                                <MultiSelect
                                    options={topics}
                                    value={field.value}
                                    onChange={(val) => {
                                        field.onChange(val)
                                        setValue("sub_topics", [])
                                    }}
                                    placeholder="Choose from Drop-down"
                                    disabled={!selectedSubject}
                                />
                            )}
                        />
                        {errors.topics && <span className={styles.errorMsg}>{errors.topics.message}</span>}
                    </div>

                    <div className={styles.field}>
                        <label>Sub Topic</label>
                        <Controller
                            control={control}
                            name="sub_topics"
                            render={({ field }) => (
                                <MultiSelect
                                    options={subTopics}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Choose from Drop-down"
                                    disabled={!selectedTopics?.length}
                                />
                            )}
                        />
                        {errors.sub_topics && <span className={styles.errorMsg}>{errors.sub_topics.message}</span>}
                    </div>
                </div>

                {/* Row 3: Duration + Difficulty */}
                <div className={styles.grid2}>
                    <div className={styles.field}>
                        <label>Duration (Minutes)</label>
                        <input type="number" placeholder="Enter the time" {...register("total_time")} />
                        {errors.total_time && <span className={styles.errorMsg}>{errors.total_time.message}</span>}
                    </div>

                    <div className={styles.field}>
                        <label>Test Difficulty Level</label>
                        <Controller
                            control={control}
                            name="difficulty"
                            render={({ field }) => (
                                <div className={styles.radioGroup}>
                                    {(["easy", "medium", "difficult"] as const).map((level) => (
                                        <label key={level} className={styles.radioLabel}>
                                            <input
                                                type="radio"
                                                value={level}
                                                checked={field.value === level}
                                                onChange={() => field.onChange(level)}
                                            />
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </label>
                                    ))}
                                </div>
                            )}
                        />
                        {errors.difficulty && <span className={styles.errorMsg}>{errors.difficulty.message}</span>}
                    </div>
                </div>

                {/* Marking Scheme */}
                <div className={styles.field}>
                    <span className={styles.sectionTitle}>Marking Scheme:</span>
                    <div className={styles.markingGrid}>
                        {(
                            [
                                { name: "wrong_marks", label: "Wrong Answer" },
                                { name: "unattempt_marks", label: "Unattempted" },
                                { name: "correct_marks", label: "Correct Answer" },
                            ] as const
                        ).map(({ name, label }) => (
                            <div key={name} className={styles.markingField}>
                                <label>{label}</label>
                                <Controller
                                    control={control}
                                    name={name}
                                    render={({ field }) => (
                                        <div className={styles.stepperInput}>
                                            <input
                                                type="number"
                                                value={field.value}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                            <div className={styles.stepperBtns}>
                                                <button type="button" onClick={() => field.onChange(Number(field.value) + 1)}>▲</button>
                                                <button type="button" onClick={() => field.onChange(Number(field.value) - 1)}>▼</button>
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>
                        ))}

                        <div className={styles.markingField}>
                            <label>No of Questions</label>
                            <input type="number" placeholder="Ex:250" {...register("total_questions")} />
                            {errors.total_questions && <span className={styles.errorMsg}>{errors.total_questions.message}</span>}
                        </div>

                        <div className={`${styles.markingField} ${styles.disabledInput}`}>
                            <label>Total Marks</label>
                            <div className={styles.stepperInput}>
                                <input type="number" placeholder="Ex:250" {...register("total_marks")} />
                            </div>
                            {errors.total_marks && <span className={styles.errorMsg}>{errors.total_marks.message}</span>}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.draftBtn}
                        disabled={isPending}
                        onClick={() => submitWithStatus("draft")}
                    >
                        Save as Draft
                    </button>
                    <button
                        type="button"
                        className={styles.nextBtn}
                        disabled={isPending}
                        onClick={() => submitWithStatus("unpublished")}
                    >
                        Next
                    </button>
                </div>
            </form>
        </div>
    )
}
