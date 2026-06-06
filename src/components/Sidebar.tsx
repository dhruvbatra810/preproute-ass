import { NavLink } from "react-router-dom"
import { TrendingUp, SquarePen, ClipboardList } from "lucide-react"
import styles from "./Sidebar.module.css"
import logoImg from "../assets/preproute lofo.png"

const links = [
    { to: "/dashboard", label: "Dashboard", icon: TrendingUp },
    { to: "/test-creation", label: "Test Creation", icon: SquarePen },
    { to: "/test-tracking", label: "Test Tracking", icon: ClipboardList },
]

export default function Sidebar() {
    return (
        <aside className={styles.sidebar}>
            <img src={logoImg} alt="PrepRoute" className={styles.logo} />
            {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        `${styles.navItem} ${isActive ? styles.active : ""}`
                    }
                >
                    <Icon size={18} />
                    {label}
                </NavLink>
            ))}
        </aside>
    )
}
