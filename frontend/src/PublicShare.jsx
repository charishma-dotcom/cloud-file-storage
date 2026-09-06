import { useEffect, useState } from "react";
import { api } from "./services/api";

export default function PublicShare() {
    const token = window.location.pathname.split("/").filter(Boolean)[1] || "";

    const [file, setFile] = useState(null);
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await api.get(`/api/public/${token}`);
                setFile(response.data);
            } catch (error) {
                console.error(error);
                setMessage(
                    error?.response?.data ||
                    "This public link is invalid, disabled, or expired."
                );
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            load();
        } else {
            setMessage("Invalid public share link.");
            setLoading(false);
        }
    }, [token]);

    const download = async () => {
        try {
            setDownloading(true);
            setMessage("");

            const response = await api.post(
                `/api/public/${token}/download`,
                null,
                {
                    params: password ? { password } : {},
                    responseType: "blob",
                    validateStatus: () => true,
                }
            );

            if (response.status < 200 || response.status >= 300) {
                let errorText = "Unable to download this file.";

                if (response.data instanceof Blob) {
                    try {
                        const text = await response.data.text();
                        if (text) errorText = text;
                    } catch {
                        // Keep the default message.
                    }
                }

                throw new Error(errorText);
            }

            const contentType =
                response.headers["content-type"] ||
                file?.fileType ||
                "application/octet-stream";

            const blob = new Blob([response.data], {
                type: contentType,
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = file?.fileName || "download";
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setMessage(
                error?.message ||
                "Unable to download this file."
            );
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="text-4xl mb-3">☁️</div>
                    <p className="font-semibold text-slate-800">
                        Loading shared file...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-slate-950 px-7 py-6 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-2xl">
                            ☁️
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">
                                Cloud Storage
                            </h1>
                            <p className="text-sm text-slate-300">
                                Public file sharing
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-7">
                    {message && (
                        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-4 py-3">
                            {message}
                        </div>
                    )}

                    {file ? (
                        <>
                            <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                                <div className="text-5xl">
                                    {file.fileType?.startsWith("image/")
                                        ? "🖼️"
                                        : file.fileType === "application/pdf"
                                        ? "📕"
                                        : "📄"}
                                </div>

                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold text-slate-900 break-words">
                                        {file.fileName}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {Number(file.fileSize || 0).toLocaleString()} bytes
                                    </p>
                                </div>
                            </div>

                            {file.requiresPassword && (
                                <div className="mt-6">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Password required
                                    </label>

                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="Enter share password"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={download}
                                disabled={downloading}
                                className="w-full mt-6 px-5 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                            >
                                {downloading
                                    ? "Preparing download..."
                                    : "⬇ Download File"}
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-10">
                            <div className="text-6xl mb-4">🔗</div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Link unavailable
                            </h2>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
