import { useState } from "react";
import { api } from "../services/api";

export default function Register({ onLogin }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();

        setMessage("");
        setLoading(true);

        try {
            // Create account
            await api.post("/api/auth/register", {
                name,
                email,
                password
            });

            // Automatically login
            const response = await api.post("/api/auth/login", {
                email,
                password
            });

            const user = response.data;

            // Save authentication information
            localStorage.setItem("token", user.token);
            localStorage.setItem("email", user.email);
            localStorage.setItem("name", user.name);
            localStorage.setItem("role", user.role || "USER");

            // Force application to reload.
            // App.jsx will detect the token and open Dashboard.
            window.location.href = "/";

        } catch (error) {
            console.error("Registration error:", error);

            setMessage(
                error.response?.data?.message ||
                "Registration failed. Please try again."
            );

            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

                <div className="text-center mb-8">

                    <h1 className="text-3xl font-bold text-slate-900">
                        Create Account
                    </h1>

                    <p className="text-slate-500 mt-2">
                        Start using Cloud File Storage
                    </p>

                </div>

                <form onSubmit={submit} className="space-y-5">

                    <div>

                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Name
                        </label>

                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>

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
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>

                    {message && (
                        <div className="px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition"
                    >
                        {loading
                            ? "Creating Account..."
                            : "Create Account"}
                    </button>

                </form>

                <div className="text-center mt-6 text-sm text-slate-600">

                    Already have an account?

                    <button
                        type="button"
                        onClick={onLogin}
                        className="ml-1 text-blue-600 hover:text-blue-700 font-semibold"
                    >
                        Login
                    </button>

                </div>

            </div>

        </div>
    );
}
