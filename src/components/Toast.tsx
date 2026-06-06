import { createContext, useCallback, useContext, useState } from "react"
import styles from "./Toast.module.css"

type ToastType = "success" | "error" | "info"

type ToastItem = {
    id: number
    message: string
    type: ToastType
}

type ToastContextValue = {
    toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

let counter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    const toast = useCallback((message: string, type: ToastType = "info") => {
        const id = ++counter
        setToasts((prev) => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3500)
    }, [])

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className={styles.container}>
                {toasts.map((t) => (
                    <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)
