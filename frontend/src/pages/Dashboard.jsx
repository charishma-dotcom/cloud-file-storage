import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

export default function Dashboard({ onLogout }) {
    // =========================
    // USER
    // =========================

    const email = localStorage.getItem("email") || "";
    const initialName = localStorage.getItem("name") || "User";
    const role = localStorage.getItem("role") || "USER";

    // =========================
    // MAIN DATA
    // =========================

    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [publicLinks, setPublicLinks] = useState([]);

    // =========================
    // NAVIGATION
    // =========================

    const [activePage, setActivePage] = useState("home");
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderPath, setFolderPath] = useState([]);

    // =========================
    // UI
    // =========================

    const [viewMode, setViewMode] = useState(
        localStorage.getItem("viewMode") || "grid"
    );

    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // =========================
    // UPLOAD
    // =========================

    const [selectedFile, setSelectedFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const dragCounter = useRef(0);
    const fileInputRef = useRef(null);

    // =========================
    // FOLDER
    // =========================

    const [folderName, setFolderName] = useState("");
    const [showNewFolder, setShowNewFolder] = useState(false);

    // =========================
    // DELETE
    // =========================

    const [deleteFileId, setDeleteFileId] = useState(null);
    const [deleteFolderId, setDeleteFolderId] = useState(null);
    const [permanentDeleteFileId, setPermanentDeleteFileId] = useState(null);
    const [trashFiles, setTrashFiles] = useState([]);

    // =========================
    // PROFILE / SETTINGS
    // =========================

    const [profileName, setProfileName] = useState(initialName);

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    // =========================
    // RENAME
    // =========================

    const [renameItem, setRenameItem] = useState(null);
    const [renameValue, setRenameValue] = useState("");

    // =========================
    // STARRED
    // =========================

    const [starredIds, setStarredIds] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("starredFiles") || "[]"
            );
        } catch {
            return [];
        }
    });

    // =========================
    // RECENT FILES
    // =========================

    const recentFilesStorageKey = `recentFiles:${(email || "guest").toLowerCase()}`;

    const [recentFiles, setRecentFiles] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem(recentFilesStorageKey) || "[]"
            );
        } catch {
            return [];
        }
    });

    // =========================
    // SHARE
    // =========================

    const [shareFile, setShareFile] = useState(null);
    const [shareMode, setShareMode] = useState("people");
    const [shareEmail, setShareEmail] = useState("");
    const [sharePermission, setSharePermission] = useState("VIEWER");
    const [shareExpiry, setShareExpiry] = useState("");
    const [sharePassword, setSharePassword] = useState("");
    const [createdShareLink, setCreatedShareLink] = useState("");
    const [shareSubmitting, setShareSubmitting] = useState(false);

    // =========================
    // FILE VIEWER
    // =========================

    const [viewerFile, setViewerFile] = useState(null);
    const [viewerUrl, setViewerUrl] = useState("");
    const [viewerText, setViewerText] = useState("");
    const [viewerLoading, setViewerLoading] = useState(false);
    const [viewerError, setViewerError] = useState("");

    useEffect(() => {
        const handleViewerKeyDown = (event) => {
            if (event.key === "Escape" && viewerFile) {
                closeFileViewer();
            }
        };

        window.addEventListener("keydown", handleViewerKeyDown);
        return () => window.removeEventListener("keydown", handleViewerKeyDown);
    }, [viewerFile, viewerUrl]);

    useEffect(() => {
        return () => {
            if (viewerUrl) {
                window.URL.revokeObjectURL(viewerUrl);
            }
        };
    }, [viewerUrl]);

    // =========================
    // STORAGE
    // =========================

    const STORAGE_LIMIT = 10 * 1024 * 1024 * 1024;

    const usedStorage = useMemo(() => {
        return files.reduce(
            (total, file) => total + Number(file.fileSize || 0),
            0
        );
    }, [files]);

    const storagePercentage = Math.min(
        100,
        (usedStorage / STORAGE_LIMIT) * 100
    );

    // =========================
    // HELPERS
    // =========================

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return "0 B";

        const units = ["B", "KB", "MB", "GB", "TB"];
        const index = Math.floor(
            Math.log(bytes) / Math.log(1024)
        );

        return `${(bytes / Math.pow(1024, index)).toFixed(
            index === 0 ? 0 : 1
        )} ${units[index]}`;
    };

    const getFileIcon = (file) => {
        const type = file.fileType || "";
        const name = file.fileName || "";

        if (type.includes("image")) return "🖼️";
        if (type.includes("pdf") || name.endsWith(".pdf")) return "📕";
        if (
            type.includes("word") ||
            name.endsWith(".doc") ||
            name.endsWith(".docx")
        )
            return "📘";
        if (
            type.includes("sheet") ||
            name.endsWith(".xls") ||
            name.endsWith(".xlsx")
        )
            return "📊";
        if (
            type.includes("presentation") ||
            name.endsWith(".ppt") ||
            name.endsWith(".pptx")
        )
            return "📙";
        if (type.includes("zip") || name.endsWith(".zip")) return "🗜️";
        if (type.includes("video")) return "🎬";
        if (type.includes("audio")) return "🎵";
        if (
            type.includes("text") ||
            name.endsWith(".txt") ||
            name.endsWith(".csv")
        )
            return "📄";

        return "📄";
    };

    // =========================
    // LOAD FOLDER CONTENTS
    // =========================

    const loadFolderContents = async (folderId = null) => {
        try {
            setLoading(true);

            const folderUrl =
                folderId === null
                    ? "/api/folders"
                    : `/api/folders?parentId=${folderId}`;

            const fileUrl =
                folderId === null
                    ? "/api/files"
                    : `/api/files?folderId=${folderId}`;

            const [folderResponse, fileResponse] =
                await Promise.all([
                    api.get(folderUrl),
                    api.get(fileUrl),
                ]);

            setFolders(folderResponse.data || []);
            setFiles(fileResponse.data || []);
        } catch (error) {
            console.error(error);
            setMessage("Unable to load folder contents.");
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // LOAD SHARED FILES
    // =========================

    const loadSharedFiles = async () => {
        try {
            const response = await api.get("/api/files/shared");
            setSharedFiles(response.data || []);
        } catch (error) {
            console.error(error);
            setSharedFiles([]);
        }
    };

    // =========================
    // LOAD PUBLIC LINKS
    // =========================

    const loadPublicLinks = async () => {
        try {
            const response = await api.get(
                "/api/files/public-links"
            );

            setPublicLinks(response.data || []);
        } catch (error) {
            console.error(error);
            setPublicLinks([]);
        }
    };

    // =========================
    // LOAD TRASH
    // =========================

    const loadTrashFiles = async () => {
        try {
            const response = await api.get("/api/files/trash");
            setTrashFiles(response.data || []);
        } catch (error) {
            console.error(error);
            setTrashFiles([]);
            setMessage("Unable to load Trash.");
        }
    };

    // =========================
    // INITIAL LOAD
    // =========================
    useEffect(() => {
        loadFolderContents(null);
        loadSharedFiles();
        loadPublicLinks();
        loadTrashFiles();
    }, []);

    // =========================
    // SAVE VIEW MODE
    // =========================

    useEffect(() => {
        localStorage.setItem("viewMode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        cleanupRecentFiles();
        // Recent files are intentionally checked only once when the dashboard loads.
        // The delete handler removes a file immediately after a successful delete.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =========================
    // CREATE FOLDER
    // =========================

    const createFolder = async (e) => {
        e.preventDefault();

        const trimmedName = folderName.trim();

        if (!trimmedName) {
            setMessage("Please enter a folder name.");
            return;
        }

        try {
            await api.post("/api/folders", {
                name: trimmedName,
                parentId: currentFolder
                    ? currentFolder.id
                    : null,
            });

            setFolderName("");
            setShowNewFolder(false);
            setMessage("Folder created successfully.");

            await loadFolderContents(
                currentFolder ? currentFolder.id : null
            );
        } catch (error) {
            console.error(error);
            setMessage("Unable to create folder.");
        }
    };

    // =========================
    // OPEN FOLDER
    // =========================

    const openFolder = async (folder) => {
        setCurrentFolder(folder);

        setFolderPath((previous) => [
            ...previous,
            folder,
        ]);

        setActivePage("files");
        setSearch("");
        setMessage("");

        await loadFolderContents(folder.id);
    };

    // =========================
    // GO HOME / ROOT
    // =========================

    const goToRoot = async () => {
        setCurrentFolder(null);
        setFolderPath([]);
        setActivePage("files");
        setSearch("");

        await loadFolderContents(null);
    };

    // =========================
    // GO BACK
    // =========================

    const goBack = async () => {
        if (folderPath.length === 0) {
            return;
        }

        const newPath = folderPath.slice(0, -1);

        setFolderPath(newPath);

        const parentFolder =
            newPath.length > 0
                ? newPath[newPath.length - 1]
                : null;

        setCurrentFolder(parentFolder);

        await loadFolderContents(
            parentFolder ? parentFolder.id : null
        );
    };

    // =========================
    // SELECT FILE
    // =========================

    const handleFileSelection = (file) => {
        setSelectedFile(file);
    };

    // =========================
    // DRAG & DROP
    // =========================

    useEffect(() => {
        const handleDragEnter = (e) => {
            if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes("Files")) {
                return;
            }

            e.preventDefault();
            dragCounter.current += 1;
            setDragging(true);
        };

        const handleDragOver = (e) => {
            if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes("Files")) {
                return;
            }

            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setDragging(true);
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            dragCounter.current -= 1;

            if (dragCounter.current <= 0) {
                dragCounter.current = 0;
                setDragging(false);
            }
        };

        window.addEventListener("dragenter", handleDragEnter);
        window.addEventListener("dragover", handleDragOver);
        window.addEventListener("dragleave", handleDragLeave);

        return () => {
            window.removeEventListener("dragenter", handleDragEnter);
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("dragleave", handleDragLeave);
        };
    }, []);

    const uploadDroppedFile = async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        if (currentFolder) {
            formData.append("folderId", currentFolder.id);
        }

        try {
            setLoading(true);
            setMessage(`Uploading ${file.name}...`);

            await api.post("/api/files/upload", formData);

            setMessage(`"${file.name}" uploaded successfully.`);

            await loadFolderContents(currentFolder ? currentFolder.id : null);
        } catch (error) {
            console.error(error);
            setMessage(
                error?.response?.data ||
                    `Unable to upload "${file.name}".`
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounter.current = 0;
        setDragging(false);

        const droppedFiles = Array.from(e.dataTransfer?.files || []);

        if (droppedFiles.length === 0) {
            return;
        }

        for (const file of droppedFiles) {
            await uploadDroppedFile(file);
        }
    };

    // =========================
    // UPLOAD FILE
    // =========================

    const uploadFile = async () => {
        if (!selectedFile) {
            setMessage("Please select a file.");
            return;
        }

        const formData = new FormData();

        formData.append("file", selectedFile);

        if (currentFolder) {
            formData.append(
                "folderId",
                currentFolder.id
            );
        }

        setLoading(true);
        setMessage("");

        try {
            await api.post(
                "/api/files/upload",
                formData
            );

            setMessage(
                `"${selectedFile.name}" uploaded successfully.`
            );

            setSelectedFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            await loadFolderContents(
                currentFolder
                    ? currentFolder.id
                    : null
            );
        } catch (error) {
            console.error(error);
            setMessage(
                error?.response?.data ||
                    "Upload failed."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // DOWNLOAD FILE
    // =========================

    const downloadFile = async (id, fileName) => {
        try {
            setMessage("Preparing download...");

            const response = await api.get(
                `/api/files/${id}/download`,
                {
                    responseType: "blob",
                }
            );

            const url =
                window.URL.createObjectURL(
                    response.data
                );

            const link =
                document.createElement("a");

            link.href = url;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            addToRecentFiles({
                id,
                fileName,
            });

            setMessage("Download started.");
        } catch (error) {
            console.error(error);
            setMessage("Download failed.");
        }
    };

    // =========================
    // OPEN FILE VIEWER
    // =========================

    const closeFileViewer = () => {
        if (viewerUrl) {
            window.URL.revokeObjectURL(viewerUrl);
        }

        setViewerFile(null);
        setViewerUrl("");
        setViewerText("");
        setViewerLoading(false);
        setViewerError("");
    };

    const openFile = async (file) => {
        if (!file || file.id == null) return;

        try {
            setViewerLoading(true);
            setViewerError("");
            setViewerText("");

            if (viewerUrl) {
                window.URL.revokeObjectURL(viewerUrl);
            }

            const response = await api.get(
                `/api/files/${file.id}/download`,
                { responseType: "blob" }
            );

            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const type = (file.fileType || blob.type || "").toLowerCase();
            const name = (file.fileName || "").toLowerCase();

            setViewerFile(file);
            setViewerUrl(url);

            if (
                type.startsWith("text/") ||
                name.endsWith(".txt") ||
                name.endsWith(".csv") ||
                name.endsWith(".json") ||
                name.endsWith(".xml") ||
                name.endsWith(".md")
            ) {
                const text = await blob.text();
                setViewerText(text);
            }

            addToRecentFiles(file);
            setMessage("File opened.");
        } catch (error) {
            console.error(error);
            setViewerError(
                error?.response?.data ||
                    "Unable to open this file. You can still download it."
            );
        } finally {
            setViewerLoading(false);
        }
    };

    // =========================
    // SHARE FILE
    // =========================

    const openShare = (file) => {
        setShareFile(file);
        setShareMode("people");
        setShareEmail("");
        setSharePermission("VIEWER");
        setShareExpiry("");
        setSharePassword("");
        setCreatedShareLink("");
        setShareSubmitting(false);
    };

    const closeShare = () => {
        setShareFile(null);
        setShareEmail("");
        setSharePermission("VIEWER");
        setShareExpiry("");
        setSharePassword("");
        setCreatedShareLink("");
        setShareSubmitting(false);
    };

    const shareWithPerson = async (e) => {
        e.preventDefault();

        if (!shareFile) return;

        const recipient = shareEmail.trim();
        if (!recipient) {
            setMessage("Please enter the email address.");
            return;
        }

        try {
            setShareSubmitting(true);

            await api.post(`/api/files/${shareFile.id}/share`, {
                email: recipient,
                permission: sharePermission,
            });

            setMessage(`File shared with ${recipient}.`);
            setShareEmail("");
        } catch (error) {
            console.error(error);
            setMessage(
                error?.response?.data ||
                    "Unable to share the file."
            );
        } finally {
            setShareSubmitting(false);
        }
    };

    const createPublicShareLink = async (e) => {
        e.preventDefault();

        if (!shareFile) return;

        try {
            setShareSubmitting(true);

            const response = await api.post(
                `/api/files/${shareFile.id}/public-link`,
                {
                    expiresAt: shareExpiry || null,
                    password: sharePassword || null,
                }
            );

            const token = response.data?.token;

            if (!token) {
                throw new Error("Public link token was not returned.");
            }

            const link = `${window.location.origin}/public/${token}`;
            setCreatedShareLink(link);
            await loadPublicLinks();
            closeShare();
            setMessage("Public share link created. You can manage it from Public Links.");
        } catch (error) {
            console.error(error);
            setMessage(
                error?.response?.data ||
                    error?.message ||
                    "Unable to create public share link."
            );
        } finally {
            setShareSubmitting(false);
        }
    };

    const copyShareLink = async () => {
        if (!createdShareLink) return;

        try {
            await navigator.clipboard.writeText(createdShareLink);
            setMessage("Share link copied.");
        } catch (error) {
            console.error(error);
            setMessage("Unable to copy the share link.");
        }
    };

    // =========================
    // RECENT FILES
    // =========================

    const addToRecentFiles = (file) => {
        if (!file || file.id == null) {
            return;
        }

        const existing = recentFiles.filter(
            (item) => String(item.id) !== String(file.id)
        );

        const updated = [
            {
                ...file,
                openedAt: new Date().toISOString(),
            },
            ...existing,
        ].slice(0, 20);

        setRecentFiles(updated);

        localStorage.setItem(
            recentFilesStorageKey,
            JSON.stringify(updated)
        );
    };

    const removeFromRecentFiles = (fileId) => {
        const updated = recentFiles.filter(
            (item) => String(item.id) !== String(fileId)
        );

        setRecentFiles(updated);

        localStorage.setItem(
            recentFilesStorageKey,
            JSON.stringify(updated)
        );
    };

    const cleanupRecentFiles = async () => {
        if (recentFiles.length === 0) {
            return;
        }

        const results = await Promise.all(
            recentFiles.map(async (file) => {
                try {
                    await api.get(`/api/files/${file.id}`);
                    return file;
                } catch {
                    return null;
                }
            })
        );

        const activeRecentFiles = results.filter(Boolean);

        if (activeRecentFiles.length !== recentFiles.length) {
            setRecentFiles(activeRecentFiles);
            localStorage.setItem(
                recentFilesStorageKey,
                JSON.stringify(activeRecentFiles)
            );
        }
    };

    // =========================
    // STAR FILE
    // =========================

    const toggleStar = (id) => {
        let updated;

        if (starredIds.includes(id)) {
            updated = starredIds.filter(
                (item) => item !== id
            );
        } else {
            updated = [
                ...starredIds,
                id,
            ];
        }

        setStarredIds(updated);

        localStorage.setItem(
            "starredFiles",
            JSON.stringify(updated)
        );
    };

    // =========================
    // DELETE FILE
    // =========================

    const deleteFile = async () => {
        if (deleteFileId === null) {
            return;
        }

        try {
            await api.delete(
                `/api/files/${deleteFileId}`
            );

            removeFromRecentFiles(deleteFileId);

            setDeleteFileId(null);

            setMessage(
                "File moved to Trash successfully."
            );

            await loadFolderContents(
                currentFolder
                    ? currentFolder.id
                    : null
            );

            await loadTrashFiles();
        } catch (error) {
            console.error(error);
            setMessage(
                error?.response?.data ||
                "Delete failed."
            );
        }
    };

    // =========================
    // RESTORE FILE
    // =========================

    const restoreFile = async (id) => {
        try {
            await api.put(`/api/files/${id}/restore`);

            setTrashFiles((previous) =>
                previous.filter(
                    (file) => String(file.id) !== String(id)
                )
            );

            setMessage("File restored successfully.");

            await loadFolderContents(
                currentFolder
                    ? currentFolder.id
                    : null
            );
        } catch (error) {
            console.error(error);
            setMessage(
                error?.response?.data ||
                "Unable to restore file."
            );
        }
    };

    // =========================
    // PERMANENT DELETE
    // =========================

    const permanentlyDeleteFile = async () => {
        if (permanentDeleteFileId === null) {
            return;
        }

        try {
            await api.delete(
                `/api/files/${permanentDeleteFileId}/permanent`
            );

            removeFromRecentFiles(permanentDeleteFileId);

            setTrashFiles((previous) =>
                previous.filter(
                    (file) =>
                        String(file.id) !==
                        String(permanentDeleteFileId)
                )
            );

            setPermanentDeleteFileId(null);

            setMessage("File permanently deleted.");
        } catch (error) {
            console.error(error);
            setMessage(
                error?.response?.data ||
                "Unable to permanently delete the file."
            );
            setPermanentDeleteFileId(null);
        }
    };

    // =========================
    // DELETE FOLDER
    // =========================

    const deleteFolder = async () => {
        if (!deleteFolderId) {
            return;
        }

        try {
            await api.delete(
                `/api/folders/${deleteFolderId}`
            );

            setDeleteFolderId(null);

            setMessage(
                "Folder deleted successfully."
            );

            await loadFolderContents(
                currentFolder
                    ? currentFolder.id
                    : null
            );
        } catch (error) {
            console.error(error);

            setDeleteFolderId(null);

            setMessage(
                "Unable to delete folder. Make sure it is empty."
            );
        }
    };

    // =========================
    // CHANGE PASSWORD
    // =========================

    const changePassword = async (e) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            setMessage(
                "Please enter the new password."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage(
                "New passwords do not match."
            );
            return;
        }

        if (newPassword.length < 6) {
            setMessage(
                "Password must contain at least 6 characters."
            );
            return;
        }

        try {
            setChangingPassword(true);

            /*
             * Current backend provides reset-password
             * using email + new password.
             *
             * oldPassword is collected in the UI so
             * we can upgrade this endpoint later to
             * verify the current password server-side.
             */

            await api.post(
                "/api/auth/reset-password",
                {
                    email,
                    password: newPassword,
                }
            );

            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");

            setMessage(
                "Password changed successfully."
            );
        } catch (error) {
            console.error(error);

            setMessage(
                error?.response?.data ||
                    "Unable to change password."
            );
        } finally {
            setChangingPassword(false);
        }
    };

    // =========================
    // RENAME UI
    // =========================

    const startRename = (type, item) => {
        setRenameItem({
            type,
            item,
        });

        setRenameValue(
            type === "file"
                ? item.fileName
                : item.name
        );
    };

    const cancelRename = () => {
        setRenameItem(null);
        setRenameValue("");
    };

    const saveRename = async () => {
        /*
         * Rename endpoint is not currently present
         * in the supplied backend code.
         *
         * This UI is ready for the backend endpoint.
         */

        if (!renameValue.trim()) {
            setMessage("Name cannot be empty.");
            return;
        }

        setMessage(
            "Rename UI is ready. Backend rename endpoint needs to be connected."
        );

        cancelRename();
    };

    // =========================
    // DISABLE PUBLIC LINK
    // =========================

    const disablePublicLink = async (linkId) => {
        try {
            await api.delete(
                `/api/files/public-link/${linkId}`
            );

            setMessage(
                "Public link disabled."
            );

            await loadPublicLinks();
        } catch (error) {
            console.error(error);

            setMessage(
                "Unable to disable public link."
            );
        }
    };

    // =========================
    // LOGOUT
    // =========================

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("email");
        localStorage.removeItem("name");
        localStorage.removeItem("role");

        onLogout();
    };

    // =========================
    // SEARCH
    // =========================

    const filteredFiles = files.filter((file) =>
        (file.fileName || "")
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    const filteredFolders = folders.filter((folder) =>
        (folder.name || "")
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    const starredFiles = files.filter((file) =>
        starredIds.includes(file.id)
    );

    // =========================
    // SIDEBAR
    // =========================

    const navigation = [
        {
            id: "home",
            icon: "🏠",
            label: "Home",
        },
        {
            id: "files",
            icon: "📁",
            label: "My Files",
        },
        {
            id: "starred",
            icon: "⭐",
            label: "Starred",
        },
        {
            id: "recent",
            icon: "🕘",
            label: "Recently Opened",
        },
        {
            id: "shared",
            icon: "👥",
            label: "Shared with Me",
        },
        {
            id: "links",
            icon: "🔗",
            label: "Public Links",
        },
        {
            id: "trash",
            icon: "🗑️",
            label: "Trash",
        },
    ];

    // =========================
    // NAVIGATION HANDLER
    // =========================

    const navigate = (page) => {
        setActivePage(page);
        setSidebarOpen(false);
        setMessage("");

        if (page === "home") {
            setCurrentFolder(null);
            setFolderPath([]);
            loadFolderContents(null);
        }

        if (page === "files") {
            loadFolderContents(
                currentFolder
                    ? currentFolder.id
                    : null
            );
        }

        if (page === "shared") {
            loadSharedFiles();
        }

        if (page === "links") {
            loadPublicLinks();
        }

        if (page === "trash") {
            loadTrashFiles();
        }
    };

    // =========================
    // FILE CARD
    // =========================

    const FileCard = ({ file }) => (
        <div
            className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-lg hover:border-blue-200 transition cursor-pointer"
            onClick={() => openFile(file)}
        >
            <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-3xl">
                    {getFileIcon(file)}
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(file.id);
                    }}
                    className="text-xl hover:scale-110 transition"
                    title="Star"
                >
                    {starredIds.includes(file.id) ? "⭐" : "☆"}
                </button>
            </div>

            <div className="mt-4 min-w-0">
                <h3
                    className="font-semibold text-slate-900 truncate hover:text-blue-600 transition"
                    title={file.fileName}
                >
                    {file.fileName}
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                    {formatBytes(Number(file.fileSize || 0))}
                </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        openShare(file);
                    }}
                    className="flex-1 min-w-[80px] px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                >
                    Share
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(file.id, file.fileName);
                    }}
                    className="flex-1 min-w-[90px] px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                    Download
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setDeleteFileId(file.id);
                    }}
                    className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100"
                >
                    Delete
                </button>
            </div>
        </div>
    );

    // =========================
    // FOLDER CARD
    // =========================

    const FolderCard = ({ folder }) => (
        <div
            className="group bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-lg hover:border-blue-200 transition cursor-pointer"
            onDoubleClick={() =>
                openFolder(folder)
            }
        >
            <div className="flex items-center justify-between">
                <button
                    onClick={() =>
                        openFolder(folder)
                    }
                    className="flex items-center gap-3 min-w-0"
                >
                    <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-3xl">
                        📁
                    </div>

                    <div className="text-left min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                            {folder.name}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                            Folder
                        </p>
                    </div>
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setDeleteFolderId(
                            folder.id
                        );
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                >
                    🗑️
                </button>
            </div>
        </div>
    );

    // =========================
    // HOME
    // =========================

    const renderHome = () => (
        <>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">
                    Welcome back, {profileName}
                </h1>

                <p className="text-slate-500 mt-1">
                    Manage your files from one place.
                </p>
            </div>

            {/* QUICK ACTIONS */}
            <div className="flex flex-wrap gap-3 mb-8">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                    📤 Add File
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setFolderName("");
                        setCurrentFolder(null);
                        setFolderPath([]);
                        setShowNewFolder(true);
                    }}
                    className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                    📁 New Folder
                </button>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <button
                    type="button"
                    onClick={() => navigate("files")}
                    className="text-left bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition cursor-pointer"
                >
                    <div className="text-3xl mb-3">
                        📁
                    </div>

                    <p className="text-sm text-slate-500">
                        Total Files
                    </p>

                    <p className="text-3xl font-bold text-slate-900 mt-1">
                        {files.length}
                    </p>

                    <span className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition">
    View Files
</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setCurrentFolder(null);
                        setFolderPath([]);
                        navigate("files");
                    }}
                    className="text-left bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition cursor-pointer"
                >
                    <div className="text-3xl mb-3">
                        📂
                    </div>

                    <p className="text-sm text-slate-500">
                        Folders
                    </p>

                    <p className="text-3xl font-bold text-slate-900 mt-1">
                        {folders.length}
                    </p>

                    <span className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition">
    View Folders
</span>
                </button>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="text-3xl mb-3">
                        💾
                    </div>

                    <p className="text-sm text-slate-500">
                        Storage Used
                    </p>

                    <p className="text-2xl font-bold text-slate-900 mt-1">
                        {formatBytes(usedStorage)}
                    </p>
                </div>
            </div>

            {/* STORAGE */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="font-bold text-slate-900">
                            Storage
                        </h2>

                        <p className="text-sm text-slate-500">
                            {formatBytes(usedStorage)} of 10 GB used
                        </p>
                    </div>

                    <span className="font-semibold text-slate-700">
                        {storagePercentage.toFixed(1)}%
                    </span>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${storagePercentage}%` }}
                    />
                </div>
            </div>

            {/* RECENTLY OPENED */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Recently Opened
                        </h2>

                        <p className="text-sm text-slate-500">
                            Your latest active files
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("recent")}
                        className="text-blue-600 text-sm font-medium hover:underline"
                    >
                        View all
                    </button>
                </div>

                {recentFiles.length === 0 ? (
                    <div className="py-10 text-center text-slate-400">
                        <div className="text-4xl mb-2">
                            🕘
                        </div>

                        <p>No recently opened files.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentFiles.slice(0, 5).map((file) => (
                            <div
                                key={file.id}
                                className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition"
                            >
                                <button
                                    type="button"
                                    onClick={() => openFile(file)}
                                    className="flex items-center gap-3 min-w-0 text-left"
                                >
                                    <span className="text-2xl">
                                        {getFileIcon(file)}
                                    </span>

                                    <span className="font-medium truncate">
                                        {file.fileName}
                                    </span>
                                </button>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => toggleStar(file.id)}
                                        className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                        title="Star"
                                    >
                                        {starredIds.includes(file.id) ? "⭐" : "☆"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => openShare(file)}
                                        className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700"
                                    >
                                        Share
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => downloadFile(file.id, file.fileName)}
                                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                                    >
                                        Download
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDeleteFileId(file.id)}
                                        className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );

    // =========================
    // FILES PAGE
    // =========================

    const renderFiles = () => (
        <>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm mb-2">
                        <button
                            type="button"
                            onClick={goToRoot}
                            className="text-blue-600 hover:underline"
                        >
                            My Files
                        </button>

                        {folderPath.map((folder) => (
                            <span key={folder.id} className="text-slate-400">
                                / {folder.name}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900">
                        {currentFolder ? currentFolder.name : "My Files"}
                    </h1>

                    <p className="text-sm text-slate-500 mt-1">
                        {folders.length} folders · {files.length} files
                    </p>
                </div>

                <div className="flex gap-2">
                    {folderPath.length > 0 && (
                        <button
                            type="button"
                            onClick={goBack}
                            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            ← Back
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            loadFolderContents(currentFolder ? currentFolder.id : null)
                        }
                        className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"
                    >
                        ↻
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 justify-between mb-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                    >
                        + Add File
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setFolderName("");
                            setShowNewFolder(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                    >
                        + New Folder
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        className={`px-4 py-2 rounded-xl ${
                            viewMode === "grid"
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-slate-200"
                        }`}
                    >
                        ▦ Grid
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={`px-4 py-2 rounded-xl ${
                            viewMode === "list"
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-slate-200"
                        }`}
                    >
                        ☷ List
                    </button>
                </div>
            </div>

            {filteredFolders.length > 0 && (
                <section className="mb-8">
                    <h2 className="font-bold text-slate-900 mb-4">Folders</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredFolders.map((folder) => (
                            <FolderCard key={folder.id} folder={folder} />
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h2 className="font-bold text-slate-900 mb-4">Files</h2>

                {filteredFiles.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center">
                        <div className="text-5xl mb-3">📂</div>
                        <h3 className="font-semibold text-slate-800">No files found</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            This folder does not contain any files yet.
                        </p>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredFiles.map((file) => (
                            <FileCard key={file.id} file={file} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                            >
                                <button
                                    type="button"
                                    onClick={() => openFile(file)}
                                    className="flex items-center gap-4 min-w-0 text-left group/file"
                                    title={`Open ${file.fileName}`}
                                >
                                    <span className="text-3xl shrink-0">
                                        {getFileIcon(file)}
                                    </span>

                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate group-hover/file:text-blue-600 transition">
                                            {file.fileName}
                                        </h3>

                                        <p className="text-xs text-slate-500">
                                            {formatBytes(Number(file.fileSize || 0))}
                                        </p>
                                    </div>
                                </button>

                                <div className="flex flex-wrap gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => toggleStar(file.id)}
                                        className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                        title="Star"
                                    >
                                        {starredIds.includes(file.id) ? "⭐" : "☆"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => openShare(file)}
                                        className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                                    >
                                        Share
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => downloadFile(file.id, file.fileName)}
                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Download
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDeleteFileId(file.id)}
                                        className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </>
    );

    // =========================
    // STARRED PAGE
    // =========================

    const renderStarred = () => (
        <>
            <PageTitle
                title="Starred"
                subtitle="Files you marked as important."
            />

            {starredFiles.length === 0 ? (
                <EmptyState
                    icon="⭐"
                    title="No starred files"
                    text="Star important files to find them quickly."
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {starredFiles.map((file) => (
                        <FileCard
                            key={file.id}
                            file={file}
                        />
                    ))}
                </div>
            )}
        </>
    );

    // =========================
    // RECENT PAGE
    // =========================

    const renderRecent = () => (
        <>
            <PageTitle
                title="Recently Opened"
                subtitle="Files you recently accessed."
            />

            {recentFiles.length === 0 ? (
                <EmptyState
                    icon="🕘"
                    title="Nothing here yet"
                    text="Files you download or open will appear here."
                />
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    {recentFiles.map((file) => (
                        <div
                            key={file.id}
                            className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-100 last:border-0"
                        >
                            <button
                                type="button"
                                onClick={() => openFile(file)}
                                className="flex items-center gap-4 min-w-0 text-left"
                            >
                                <span className="text-3xl">
                                    {getFileIcon(file)}
                                </span>

                                <div className="min-w-0">
                                    <h3 className="font-semibold truncate">
                                        {file.fileName}
                                    </h3>

                                    <p className="text-xs text-slate-500">
                                        Recently opened
                                    </p>
                                </div>
                            </button>

                            <div className="flex gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => toggleStar(file.id)}
                                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                    title="Star"
                                >
                                    {starredIds.includes(file.id) ? "⭐" : "☆"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => downloadFile(file.id, file.fileName)}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                                >
                                    Download
                                </button>

                                <button
                                    type="button"
                                    onClick={() => openShare(file)}
                                    className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700"
                                >
                                    Share
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDeleteFileId(file.id)}
                                    className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // =========================
    // SHARED PAGE
    // =========================

    const renderShared = () => (
        <>
            <PageTitle
                title="Shared with Me"
                subtitle="Files other users have shared with you."
            />

            {sharedFiles.length === 0 ? (
                <EmptyState
                    icon="👥"
                    title="No shared files"
                    text="Files shared with your account will appear here."
                />
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {sharedFiles.map(
                        (share, index) => {
                            const file =
                                share.file || {};

                            const fileId =
                                share.fileId ||
                                file.id;

                            const fileName =
                                share.fileName ||
                                file.fileName ||
                                `Shared File ${
                                    index + 1
                                }`;

                            return (
                                <div
                                    key={
                                        share.id ||
                                        index
                                    }
                                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-100 last:border-0"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl">
                                            📄
                                        </span>

                                        <div>
                                            <h3 className="font-semibold">
                                                {
                                                    fileName
                                                }
                                            </h3>

                                            <p className="text-sm text-slate-500">
                                                Permission:{" "}
                                                <span className="font-medium">
                                                    {
                                                        share.permission
                                                    }
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {fileId && (
                                        <button
                                            onClick={() =>
                                                downloadFile(
                                                    fileId,
                                                    fileName
                                                )
                                            }
                                            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                                        >
                                            Download
                                        </button>
                                    )}
                                </div>
                            );
                        }
                    )}
                </div>
            )}
        </>
    );

    // =========================
    // PUBLIC LINKS
    // =========================

    const renderLinks = () => (
        <>
            <PageTitle
                title="Public Links"
                subtitle="Manage links you created for your files."
            />

            {publicLinks.length === 0 ? (
                <EmptyState
                    icon="🔗"
                    title="No public links"
                    text="Public share links you create will appear here."
                />
            ) : (
                <div className="space-y-4">
                    {publicLinks.map((link) => (
                        <div
                            key={link.id}
                            className="bg-white rounded-2xl border border-slate-200 p-5"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        {
                                            link.fileName
                                        }
                                    </h3>

                                    <p className="text-xs text-slate-500 mt-1">
                                        Created:{" "}
                                        {link.createdAt
                                            ? new Date(
                                                  link.createdAt
                                              ).toLocaleString()
                                            : "-"}
                                    </p>

                                    <p className="text-xs mt-1">
                                        Status:{" "}
                                        <span
                                            className={
                                                link.active
                                                    ? "text-emerald-600 font-semibold"
                                                    : "text-red-600 font-semibold"
                                            }
                                        >
                                            {link.active
                                                ? "Active"
                                                : "Disabled"}
                                        </span>
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    {link.active && (
                                        <button
                                            onClick={() =>
                                                disablePublicLink(
                                                    link.id
                                                )
                                            }
                                            className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                        >
                                            Disable
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // =========================
    // TRASH
    // =========================

    const renderTrash = () => (
        <>
            <PageTitle
                title="Trash"
                subtitle="Deleted files. Restore them or permanently delete them."
            />

            {trashFiles.length === 0 ? (
                <EmptyState
                    icon="🗑️"
                    title="Trash is empty"
                    text="Files you delete will appear here."
                />
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {trashFiles.map((file) => (
                        <div
                            key={file.id}
                            className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-100 last:border-0"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl shrink-0">
                                    {getFileIcon(file)}
                                </div>

                                <div className="min-w-0">
                                    <h3
                                        className="font-semibold text-slate-900 truncate"
                                        title={file.fileName}
                                    >
                                        {file.fileName}
                                    </h3>

                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatBytes(Number(file.fileSize || 0))}
                                        {file.deletedAt
                                            ? ` • Deleted ${new Date(file.deletedAt).toLocaleString()}`
                                            : ""}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => restoreFile(file.id)}
                                    className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium"
                                >
                                    ♻️ Restore
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPermanentDeleteFileId(file.id)}
                                    className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                                >
                                    Permanently Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // =========================
    // PROFILE
    // =========================

    const renderProfile = () => (
        <>
            <PageTitle
                title="Profile"
                subtitle="Manage your account information."
            />

            <div className="max-w-3xl">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-700">
                            {profileName
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {profileName}
                            </h2>

                            <p className="text-slate-500">
                                {email}
                            </p>

                            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-medium">
                                {role}
                            </span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        <InfoBox
                            label="Name"
                            value={profileName}
                        />

                        <InfoBox
                            label="Email"
                            value={email}
                        />

                        <InfoBox
                            label="Account Role"
                            value={role}
                        />

                        <InfoBox
                            label="Storage Used"
                            value={`${formatBytes(
                                usedStorage
                            )} / 10 GB`}
                        />
                    </div>
                </div>
            </div>
        </>
    );

    // =========================
    // SETTINGS
    // =========================

    const renderSettings = () => (
        <>
            <PageTitle
                title="Settings"
                subtitle="Manage your account and preferences."
            />

            <div className="max-w-3xl space-y-6">
                {/* CHANGE PASSWORD */}

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        Change Password
                    </h2>

                    <p className="text-sm text-slate-500 mt-1 mb-6">
                        Update your account password.
                    </p>

                    <form
                        onSubmit={changePassword}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Current Password
                            </label>

                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) =>
                                    setOldPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Current password"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                New Password
                            </label>

                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="New password"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm New Password
                            </label>

                            <input
                                type="password"
                                value={
                                    confirmPassword
                                }
                                onChange={(e) =>
                                    setConfirmPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Confirm new password"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={
                                changingPassword
                            }
                            className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {changingPassword
                                ? "Changing..."
                                : "Change Password"}
                        </button>
                    </form>
                </div>

                {/* STORAGE */}

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        Storage
                    </h2>

                    <div className="flex justify-between mt-5 mb-2">
                        <span className="text-sm text-slate-500">
                            Used
                        </span>

                        <span className="text-sm font-semibold">
                            {formatBytes(
                                usedStorage
                            )}{" "}
                            / 10 GB
                        </span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600"
                            style={{
                                width: `${storagePercentage}%`,
                            }}
                        />
                    </div>
                </div>
            </div>
        </>
    );

    // =========================
    // CURRENT PAGE
    // =========================

    const renderPage = () => {
        switch (activePage) {
            case "home":
                return renderHome();

            case "files":
                return renderFiles();

            case "starred":
                return renderStarred();

            case "recent":
                return renderRecent();

            case "shared":
                return renderShared();

            case "links":
                return renderLinks();

            case "trash":
                return renderTrash();

            case "profile":
                return renderProfile();

            case "settings":
                return renderSettings();

            default:
                return renderHome();
        }
    };

    // =========================
    // UI
    // =========================

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* MOBILE OVERLAY */}

            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                    onClick={() =>
                        setSidebarOpen(false)
                    }
                />
            )}

            {/* SIDEBAR */}

            <aside
                className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-slate-950 text-white flex flex-col transition-transform duration-300 ${
                    sidebarOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                }`}
            >
                {/* LOGO */}

                <div className="px-6 py-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-2xl">
                            ☁️
                        </div>

                        <div>
                            <h1 className="font-bold text-lg">
                                Cloud Storage
                            </h1>

                            <p className="text-xs text-slate-400">
                                Secure file management
                            </p>
                        </div>
                    </div>
                </div>

                {/* NAVIGATION */}

                <nav className="flex-1 px-4 py-5 overflow-y-auto">
                    <p className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Workspace
                    </p>

                    <div className="space-y-1">
                        {navigation.map(
                            (item) => (
                                <button
                                    key={item.id}
                                    onClick={() =>
                                        navigate(
                                            item.id
                                        )
                                    }
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                                        activePage ===
                                        item.id
                                            ? "bg-blue-600 text-white"
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                >
                                    <span className="text-lg">
                                        {
                                            item.icon
                                        }
                                    </span>

                                    <span>
                                        {
                                            item.label
                                        }
                                    </span>
                                </button>
                            )
                        )}
                    </div>

                    <div className="border-t border-slate-800 my-6" />

                    <p className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Account
                    </p>

                    <div className="space-y-1">
                        <button
                            onClick={() =>
                                navigate(
                                    "profile"
                                )
                            }
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                                activePage ===
                                "profile"
                                    ? "bg-blue-600"
                                    : "text-slate-300 hover:bg-slate-800"
                            }`}
                        >
                            👤
                            <span>
                                Profile
                            </span>
                        </button>

                        <button
                            onClick={() =>
                                navigate(
                                    "settings"
                                )
                            }
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                                activePage ===
                                "settings"
                                    ? "bg-blue-600"
                                    : "text-slate-300 hover:bg-slate-800"
                            }`}
                        >
                            ⚙️
                            <span>
                                Settings
                            </span>
                        </button>
                    </div>
                </nav>

                {/* STORAGE */}

                <div className="px-5 pb-4">
                    <div className="bg-slate-900 rounded-2xl p-4">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs text-slate-400">
                                Storage
                            </span>

                            <span className="text-xs text-slate-300">
                                {formatBytes(
                                    usedStorage
                                )}
                            </span>
                        </div>

                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                    width: `${storagePercentage}%`,
                                }}
                            />
                        </div>

                        <p className="text-xs text-slate-500 mt-2">
                            10 GB total
                        </p>
                    </div>
                </div>

                {/* USER */}

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                            {profileName
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                                {profileName}
                            </p>

                            <p className="text-xs text-slate-500 truncate">
                                {email}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium"
                    >
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {/* MAIN AREA */}

            <div className="flex-1 min-w-0">
                {/* TOP BAR */}

                <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                    <div className="px-4 md:px-6 py-4 flex items-center gap-4">
                        <button
                            onClick={() =>
                                setSidebarOpen(
                                    true
                                )
                            }
                            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                        >
                            ☰
                        </button>

                        <div className="relative flex-1 max-w-2xl">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                🔍
                            </span>

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder="Search files and folders..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-xl border border-transparent focus:bg-white focus:border-blue-300 focus:outline-none"
                            />
                        </div>

                        <button
                            onClick={() =>
                                navigate(
                                    "profile"
                                )
                            }
                            className="hidden sm:flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                                {profileName
                                    .charAt(
                                        0
                                    )
                                    .toUpperCase()}
                            </div>

                            <div className="hidden md:block text-left">
                                <p className="text-sm font-semibold text-slate-900">
                                    {
                                        profileName
                                    }
                                </p>

                                <p className="text-xs text-slate-500">
                                    {
                                        email
                                    }
                                </p>
                            </div>
                        </button>
                    </div>
                </header>

                {/* CONTENT */}

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (file) {
                            uploadDroppedFile(file);
                        }

                        e.target.value = "";
                    }}
                />

                <main
                    className={`relative p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)] ${
                        dragging ? "bg-blue-50/40" : ""
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    {dragging && (
                        <div className="fixed inset-0 z-[100] pointer-events-none bg-blue-600/10 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="w-[90%] max-w-2xl rounded-3xl border-4 border-dashed border-blue-500 bg-white/95 shadow-2xl p-12 text-center">
                                <div className="w-24 h-24 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-5xl mb-6">
                                    ⬆️
                                </div>
                                <h2 className="text-3xl font-bold text-blue-700">
                                    Drop files here
                                </h2>
                                <p className="text-slate-500 text-lg mt-3">
                                    Release your files to upload them
                                </p>
                                {currentFolder && (
                                    <p className="text-sm text-slate-400 mt-2">
                                        Uploading to: <span className="font-semibold">{currentFolder.name}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {/* MESSAGE */}

                    {message && (
                        <div className="mb-6 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-center justify-between">
                            <span>
                                {
                                    message
                                }
                            </span>

                            <button
                                onClick={() =>
                                    setMessage(
                                        ""
                                    )
                                }
                                className="text-blue-500 hover:text-blue-700"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {renderPage()}
                </main>
            </div>

            {/* NEW FOLDER MODAL */}

            {showNewFolder && (
                <Modal
                    title="Create New Folder"
                    onClose={() =>
                        setShowNewFolder(
                            false
                        )
                    }
                >
                    <form
                        onSubmit={
                            createFolder
                        }
                    >
                        <input
                            autoFocus
                            type="text"
                            value={
                                folderName
                            }
                            onChange={(e) =>
                                setFolderName(
                                    e.target
                                        .value
                                )
                            }
                            placeholder="Folder name"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowNewFolder(
                                        false
                                    )
                                }
                                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold"
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* DELETE FILE MODAL */}

            {deleteFileId !== null && (
                <Modal
                    title="Delete File?"
                    onClose={() =>
                        setDeleteFileId(
                            null
                        )
                    }
                >
                    <p className="text-slate-500">
                        Are you sure you want to
                        delete this file?
                    </p>

                    <div className="flex justify-end gap-3 mt-7">
                        <button
                            onClick={() =>
                                setDeleteFileId(
                                    null
                                )
                            }
                            className="px-5 py-2.5 rounded-xl border border-slate-300"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={
                                deleteFile
                            }
                            className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold"
                        >
                            Delete
                        </button>
                    </div>
                </Modal>
            )}

            {/* PERMANENT DELETE MODAL */}

            {permanentDeleteFileId !== null && (
                <Modal
                    title="Permanently Delete File?"
                    onClose={() => setPermanentDeleteFileId(null)}
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                            <div className="text-3xl">⚠️</div>

                            <div>
                                <p className="font-semibold text-red-800">
                                    This action cannot be undone.
                                </p>

                                <p className="text-sm text-red-600 mt-1">
                                    The file will be permanently removed from your storage.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setPermanentDeleteFileId(null)}
                                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={permanentlyDeleteFile}
                                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
                            >
                                Permanently Delete
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* DELETE FOLDER MODAL */}

            {deleteFolderId !== null && (
                <Modal
                    title="Delete Folder?"
                    onClose={() =>
                        setDeleteFolderId(
                            null
                        )
                    }
                >
                    <p className="text-slate-500">
                        Make sure the folder is empty
                        before deleting it.
                    </p>

                    <div className="flex justify-end gap-3 mt-7">
                        <button
                            onClick={() =>
                                setDeleteFolderId(
                                    null
                                )
                            }
                            className="px-5 py-2.5 rounded-xl border border-slate-300"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={
                                deleteFolder
                            }
                            className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold"
                        >
                            Delete
                        </button>
                    </div>
                </Modal>
            )}

            {/* RENAME MODAL */}

            {renameItem && (
                <Modal
                    title="Rename"
                    onClose={
                        cancelRename
                    }
                >
                    <input
                        autoFocus
                        type="text"
                        value={
                            renameValue
                        }
                        onChange={(e) =>
                            setRenameValue(
                                e.target
                                    .value
                            )
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={
                                cancelRename
                            }
                            className="px-5 py-2.5 rounded-xl border border-slate-300"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={
                                saveRename
                            }
                            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold"
                        >
                            Save
                        </button>
                    </div>
                </Modal>
            )}

            {/* FILE VIEWER */}

            {viewerFile && (
                <div className="fixed inset-0 z-[80] bg-slate-100 flex flex-col">
                    {/* VIEWER NAVBAR */}
                    <div className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={closeFileViewer}
                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xl flex items-center justify-center shrink-0"
                                title="Close"
                            >
                                ✕
                            </button>

                            <div className="min-w-0">
                                <h2 className="font-semibold text-slate-900 truncate">
                                    {viewerFile.fileName}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {formatBytes(Number(viewerFile.fileSize || 0))}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => downloadFile(viewerFile.id, viewerFile.fileName)}
                                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                            >
                                ⬇ Download
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    const fileToEdit = viewerFile;
                                    closeFileViewer();
                                    startRename("file", fileToEdit);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                            >
                                ✏️ Edit
                            </button>
                        </div>
                    </div>

                    {/* VIEWER CONTENT */}
                    <div className="flex-1 min-h-0 overflow-auto p-4 md:p-8 flex items-center justify-center">
                        {viewerLoading ? (
                            <div className="text-center">
                                <div className="text-4xl mb-3">⏳</div>
                                <p className="text-slate-600 font-medium">Opening file...</p>
                            </div>
                        ) : viewerError ? (
                            <div className="max-w-lg w-full bg-white rounded-2xl border border-red-200 p-8 text-center">
                                <div className="text-5xl mb-4">⚠️</div>
                                <h3 className="text-xl font-bold text-slate-900">Unable to preview this file</h3>
                                <p className="text-slate-500 mt-2">{viewerError}</p>
                                <button
                                    type="button"
                                    onClick={() => downloadFile(viewerFile.id, viewerFile.fileName)}
                                    className="mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                                >
                                    Download File
                                </button>
                            </div>
                        ) : (() => {
                            const type = (viewerFile.fileType || "").toLowerCase();
                            const name = (viewerFile.fileName || "").toLowerCase();

                            if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) {
                                return (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <img
                                            src={viewerUrl}
                                            alt={viewerFile.fileName}
                                            className="max-w-full max-h-full object-contain rounded-xl shadow-lg bg-white"
                                        />
                                    </div>
                                );
                            }

                            if (type.includes("pdf") || name.endsWith(".pdf")) {
                                return (
                                    <iframe
                                        src={viewerUrl}
                                        title={viewerFile.fileName}
                                        className="w-full h-full min-h-[70vh] rounded-xl border border-slate-300 bg-white"
                                    />
                                );
                            }

                            if (type.startsWith("video/") || /\.(mp4|webm|ogg|mov)$/.test(name)) {
                                return (
                                    <video
                                        src={viewerUrl}
                                        controls
                                        className="max-w-full max-h-full rounded-xl shadow-lg bg-black"
                                    />
                                );
                            }

                            if (type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/.test(name)) {
                                return (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-2xl">
                                        <div className="text-6xl text-center mb-6">🎵</div>
                                        <h3 className="text-lg font-bold text-center mb-6">{viewerFile.fileName}</h3>
                                        <audio src={viewerUrl} controls className="w-full" />
                                    </div>
                                );
                            }

                            if (
                                type.startsWith("text/") ||
                                /\.(txt|csv|json|xml|md)$/.test(name)
                            ) {
                                return (
                                    <pre className="w-full max-w-6xl min-h-full bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-800 whitespace-pre-wrap break-words overflow-auto shadow-sm">
                                        {viewerText}
                                    </pre>
                                );
                            }

                            return (
                                <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                                    <div className="text-6xl mb-4">{getFileIcon(viewerFile)}</div>
                                    <h3 className="text-xl font-bold text-slate-900">Preview not available</h3>
                                    <p className="text-slate-500 mt-2">This file type cannot be displayed in the browser.</p>
                                    <button
                                        type="button"
                                        onClick={() => downloadFile(viewerFile.id, viewerFile.fileName)}
                                        className="mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                                    >
                                        Download File
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* SHARE MODAL */}

            {shareFile && (
                <Modal
                    title={`Share ${shareFile.fileName || "File"}`}
                    onClose={closeShare}
                >
                    <div className="space-y-5">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setShareMode("people")}
                                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                                    shareMode === "people"
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                👤 Share with Person
                            </button>

                            <button
                                type="button"
                                onClick={() => setShareMode("link")}
                                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                                    shareMode === "link"
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                🔗 Public Link
                            </button>
                        </div>

                        {shareMode === "people" ? (
                            <form onSubmit={shareWithPerson} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={shareEmail}
                                        onChange={(e) => setShareEmail(e.target.value)}
                                        placeholder="recipient@example.com"
                                        autoFocus
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Permission
                                    </label>
                                    <select
                                        value={sharePermission}
                                        onChange={(e) => setSharePermission(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="VIEWER">Viewer — view/download</option>
                                        <option value="EDITOR">Editor — modify/upload/delete</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeShare}
                                        className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={shareSubmitting}
                                        className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300"
                                    >
                                        {shareSubmitting ? "Sharing..." : "Share File"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={createPublicShareLink} className="space-y-4">
                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                    <p className="text-sm text-blue-800">
                                        Anyone with the generated link can access this file. You can optionally add an expiry date and password.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Expiry (optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={shareExpiry}
                                        onChange={(e) => setShareExpiry(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Password (optional)
                                    </label>
                                    <input
                                        type="password"
                                        value={sharePassword}
                                        onChange={(e) => setSharePassword(e.target.value)}
                                        placeholder="Leave empty for no password"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {createdShareLink && (
                                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                                        <p className="text-sm font-semibold text-emerald-800">
                                            Public link created
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                value={createdShareLink}
                                                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-emerald-200 bg-white text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={copyShareLink}
                                                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeShare}
                                        className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={shareSubmitting}
                                        className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 disabled:bg-violet-300"
                                    >
                                        {shareSubmitting ? "Creating..." : "Create Link"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}

// =========================
// PAGE TITLE
// =========================

function PageTitle({ title, subtitle }) {
    return (
        <div className="mb-7">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {title}
            </h1>

            <p className="text-slate-500 mt-1">
                {subtitle}
            </p>
        </div>
    );
}

// =========================
// EMPTY STATE
// =========================

function EmptyState({
    icon,
    title,
    text,
}) {
    return (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-14 text-center">
            <div className="text-5xl mb-4">
                {icon}
            </div>

            <h2 className="text-xl font-bold text-slate-800">
                {title}
            </h2>

            <p className="text-sm text-slate-500 mt-2">
                {text}
            </p>
        </div>
    );
}

// =========================
// INFO BOX
// =========================

function InfoBox({ label, value }) {
    return (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">
                {label}
            </p>

            <p className="font-semibold text-slate-900 mt-1 break-all">
                {value}
            </p>
        </div>
    );
}

// =========================
// MODAL
// =========================

function Modal({
    title,
    children,
    onClose,
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900">
                        {title}
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 text-xl"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}