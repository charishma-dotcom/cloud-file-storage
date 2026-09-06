import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PublicShare from "./PublicShare";
import "./index.css";

function App() {
    const [page, setPage] = useState(
        localStorage.getItem("token") ? "dashboard" : "login"
    );

    const publicMatch =
        window.location.pathname.match(/^\/public\/([^/]+)$/);

    if (publicMatch) {
        return <PublicShare />;
    }

    if (page === "register") {
        return (
            <Register
                onLogin={() => setPage("dashboard")}
            />
        );
    }

    if (page === "dashboard") {
        return (
            <Dashboard
                onLogout={() => setPage("login")}
            />
        );
    }

    return (
        <Login
            onRegister={() => setPage("register")}
            onLogin={() => setPage("dashboard")}
        />
    );
}

export default App;
