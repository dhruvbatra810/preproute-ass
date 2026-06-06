import { useNavigate } from "react-router-dom"
import type { Test } from "../types"
import { useTestCreationStore } from "../store/testCreationStore"
import { useDeleteTest } from "../hooks/apihooks"
import { useToast } from "./Toast"
import styles from "./TestCard.module.css"

type Props = {
    test: Test
}

export default function TestCard({ test }: Props) {
    const navigate = useNavigate()
    const { setFormData } = useTestCreationStore()
    const { mutate: deleteTest, isPending: isDeleting } = useDeleteTest()
    const { toast } = useToast()

    const goToTestPage = () => {
        setFormData({}, test.id)
        navigate("/test-creation")
    }

    const handleDelete = () => {
        if (!window.confirm(`Delete "${test.name}"? This cannot be undone.`)) return
        deleteTest(test.id, {
            onError: () => toast("Failed to delete test. Please try again.", "error"),
        })
    }

    const isLocked = test.status === "published" || test.status === "live"

    const createdDate = new Date(test.created_at).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    })

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.name}>{test.name}</h3>
                <span className={`${styles.badge} ${styles[test.status]}`}>
                    {test.status}
                </span>
            </div>

            <div className={styles.meta}>
                <span className={styles.subject}>{test.subject}</span>
                <div className={styles.topics}>
                    {test.topics.map((topic) => (
                        <span key={topic} className={styles.topic}>{topic}</span>
                    ))}
                </div>
                <span className={styles.date}>{createdDate}</span>
            </div>

            <div className={styles.actions}>
                <button className={styles.viewBtn} onClick={goToTestPage} disabled={isLocked}>
                    View
                </button>
                <button className={styles.editBtn} onClick={goToTestPage} disabled={isLocked}>
                    Edit
                </button>
                <button className={styles.deleteBtn} onClick={handleDelete} disabled={isDeleting || isLocked}>
                    {isDeleting ? "Deleting…" : "Delete"}
                </button>
            </div>
        </div>
    )
}
