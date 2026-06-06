import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { useGetTests } from "../../hooks/apihooks"
import { useTestCreationStore } from "../../store/testCreationStore"
import { useQuestionStore } from "../../store/questionStore"
import TestCard from "../../components/TestCard"
import styles from "./Dashboard.module.css"

export default function Dashboard() {
    const navigate = useNavigate()
    const { data, isLoading, isError } = useGetTests()
    const { clearAll } = useTestCreationStore()
    const { clearQuestions } = useQuestionStore()
    const [query, setQuery] = useState("")

    const tests = data?.data ?? []
    const filtered = query.trim()
        ? tests.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
        : tests

    return (
        <div className={styles.page}>
            <div className={styles.topBar}>
                <h1 className={styles.title}>All Tests</h1>
                <div className={styles.topBarRight}>
                    <div className={styles.searchWrapper}>
                        <Search size={15} className={styles.searchIcon} />
                        <input
                            className={styles.searchInput}
                            placeholder="Search tests..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button
                        className={styles.createBtn}
                        onClick={() => { clearAll(); clearQuestions(); navigate("/test-creation") }}
                    >
                        + Create Test
                    </button>
                </div>
            </div>

            {isLoading && <span className={styles.empty}>Loading tests...</span>}
            {isError && <span className={styles.error}>Failed to load tests.</span>}

            {data && (
                <div className={styles.grid}>
                    {filtered.length === 0
                        ? <span className={styles.empty}>{query ? `No tests match "${query}".` : "No tests yet."}</span>
                        : filtered.map((test) => (
                            <TestCard key={test.id} test={test} />
                        ))
                    }
                </div>
            )}
        </div>
    )
}
