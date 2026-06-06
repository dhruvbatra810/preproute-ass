import { createBrowserRouter, redirect } from "react-router-dom";
import LoginPage from "./pages/loginPage/loginPage";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import TestCreationPage from "./pages/testCreation/TestCreationPage";
import QuestionPage from "./pages/question/QuestionPage";

const UserLoginLoader = async () => {
    const token = localStorage.getItem('token');
    if (!token) throw redirect('/')
}

export const router = createBrowserRouter([
    {
        path: '/',
        element: <LoginPage />
    },
    {
        element: <MainLayout />,
        loader: UserLoginLoader,
        children: [
            {
                path: '/dashboard',
                element: <Dashboard />
            },
            {
                path: '/test-creation',
                element: <TestCreationPage />
            },
            {
                path: '/question',
                element: <QuestionPage />
            },
        ]
    }
])
