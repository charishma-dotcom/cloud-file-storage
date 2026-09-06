import { useState } from "react";
import { api } from "../services/api";

export default function Login({ onRegister, onLogin }) {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setMessage("");

        try {
            const response = await api.post("/api/auth/login", {
                email,
                password
            });

            console.log("LOGIN SUCCESS:", response.data);

            localStorage.setItem("token", response.data.token);
            localStorage.setItem("email", response.data.email);
            localStorage.setItem("name", response.data.name);
            localStorage.setItem("role", response.data.role);

            onLogin();

        } catch (error) {

            console.error("LOGIN ERROR:", error);

            if (!error.response) {
                setMessage("Cannot connect to the backend.");
            } else if (error.response.status === 401 ||
                       error.response.status === 403) {
                setMessage("Invalid email or password.");
            } else {
                setMessage(
                    `Login failed (${error.response.status}).`
                );
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

                <div className="text-center mb-8">

                    <h1 className="text-3xl font-bold text-slate-900">
                        Cloud File Storage
                    </h1>

                    <p className="text-slate-500 mt-2">
                        Login to your account
                    </p>

                </div>

                <form onSubmit={submit} className="space-y-5">

                    <div>

                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>

                    <div>

                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>

                    {message && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                    >
                        Login
                    </button>

                </form>

                <div className="text-center mt-6 text-sm text-slate-600">

                    Don't have an account?

                    <button
                        type="button"
                        onClick={onRegister}
                        className="ml-1 text-blue-600 hover:text-blue-700 font-semibold"
                    >
                        Register
                    </button>

                </div>

            </div>

        </div>
    );
}
