import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import styles from "./MultiSelect.module.css"

type Option = {
    id: string
    name: string
}

type Props = {
    options: Option[]
    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    disabled?: boolean
}

export default function MultiSelect({ options, value, onChange, placeholder = "Choose from Drop-down", disabled = false }: Props) {
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const toggle = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter((v) => v !== id))
        } else {
            onChange([...value, id])
        }
    }

    const selectedLabels = options.filter((o) => value.includes(o.id))

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <button
                type="button"
                className={`${styles.trigger} ${disabled ? styles.disabled : ""}`}
                onClick={() => !disabled && setOpen((o) => !o)}
            >
                <span className={styles.selectedTags}>
                    {selectedLabels.length === 0
                        ? <span className={styles.placeholder}>{placeholder}</span>
                        : selectedLabels.map((o) => (
                            <span key={o.id} className={styles.tag}>{o.name}</span>
                        ))
                    }
                </span>
                <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.open : ""}`} />
            </button>

            {open && !disabled && (
                <div className={styles.dropdown}>
                    {options.length === 0
                        ? <div className={styles.empty}>No options available</div>
                        : options.map((option) => (
                            <label key={option.id} className={styles.option}>
                                <input
                                    type="checkbox"
                                    checked={value.includes(option.id)}
                                    onChange={() => toggle(option.id)}
                                />
                                {option.name}
                            </label>
                        ))
                    }
                </div>
            )}
        </div>
    )
}
