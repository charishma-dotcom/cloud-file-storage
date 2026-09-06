import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:8080",
    headers: {
        Accept: "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error(
            "API ERROR:",
            error.config?.method?.toUpperCase(),
            error.config?.url,
            error.response?.status,
            error.response?.data
        );

        if (error.response?.status === 401) {
            console.warn("Authentication expired or invalid.");
        }

        return Promise.reject(error);
    }
);