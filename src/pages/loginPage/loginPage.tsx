import { useForm } from "react-hook-form"
import type { SubmitHandler } from "react-hook-form"
import styles from "./loginPage.module.css"
import logoImg from "../../assets/preproute lofo.png"
import illustrationImg from "../../assets/TEST TUBE MAN.png"
import { useLoginApi } from "../../hooks/apihooks"
import { useNavigate } from "react-router-dom"
import { useToast } from "../../components/Toast"

type LoginFormData = {
    userid: string
    password: string
}

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>()
    const { mutate, isPending } = useLoginApi()
    const navigate = useNavigate()
    const { toast } = useToast()

    const handleSub: SubmitHandler<LoginFormData> = (data) => {
        mutate(
            { userId: data.userid, password: data.password },
            {
                onSuccess: (res) => {
                    localStorage.setItem("token", res.data.token)
                    navigate('/dashboard')
                },
                onError: (err: unknown) => {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    toast(msg ?? "Invalid credentials. Please try again.", "error")
                }
            }
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.left}>
                <img src={illustrationImg} alt="illustration" className={styles.illustration} />
            </div>

            <div className={styles.right}>
                <div className={styles.formWrapper}>
                    <img src={logoImg} alt="PrepRoute" className={styles.logo} />

                    <div className={styles.heading}>
                        <h1>Login</h1>
                        <p>Use your company provided Login credentials</p>
                    </div>

                    <form onSubmit={handleSubmit(handleSub)} className={styles.fields}>
                        <div className={styles.field}>
                            <label htmlFor="userid">User ID</label>
                            <input
                                id="userid"
                                placeholder="Enter User ID"
                                {...register("userid", { required: "User ID is required" })}
                            />
                            {errors.userid && <span className={styles.errorMsg}>{errors.userid.message}</span>}
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Enter Password"
                                {...register("password", { required: "Password is required" })}
                            />
                            {errors.password && <span className={styles.errorMsg}>{errors.password.message}</span>}
                        </div>

                        <a href="#" className={styles.forgot}>Forgot password?</a>

                        <button type="submit" disabled={isPending} className={styles.submitBtn}>
                                    {isPending ? "Logging in..." : "Login"}
                                </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
