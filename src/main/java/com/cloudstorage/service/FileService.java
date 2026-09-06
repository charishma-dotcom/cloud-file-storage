package com.cloudstorage.service;

import com.cloudstorage.model.Folder;
import com.cloudstorage.model.StoredFile;
import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.FolderRepository;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class FileService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;

    private final Path storageLocation =
            Paths.get("uploads")
                    .toAbsolutePath()
                    .normalize();

    public FileService(
            FileRepository fileRepository,
            FolderRepository folderRepository) {

        this.fileRepository = fileRepository;
        this.folderRepository = folderRepository;

        try {
            Files.createDirectories(storageLocation);
        } catch (IOException e) {
            throw new RuntimeException(
                    "Could not create upload directory",
                    e
            );
        }
    }

    // =========================================================
    // UPLOAD FILE
    // =========================================================

    public StoredFile uploadFile(
            MultipartFile file,
            String ownerEmail,
            Long folderId) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        String originalName = file.getOriginalFilename();

        if (originalName == null || originalName.isBlank()) {
            throw new RuntimeException("Invalid file name");
        }

        // Prevent path traversal
        String safeFileName =
                Paths.get(originalName)
                        .getFileName()
                        .toString();

        // Generate unique storage name
        String storedName =
                UUID.randomUUID() + "_" + safeFileName;

        Path targetLocation =
                storageLocation
                        .resolve(storedName)
                        .normalize();

        // Make sure file stays inside uploads directory
        if (!targetLocation.startsWith(storageLocation)) {
            throw new RuntimeException("Invalid file path");
        }

        // Save physical file
        Files.copy(
                file.getInputStream(),
                targetLocation,
                StandardCopyOption.REPLACE_EXISTING
        );

        // Create database record
        StoredFile storedFile = new StoredFile();

        storedFile.setFileName(safeFileName);

        storedFile.setFileType(
                file.getContentType()
        );

        storedFile.setFileSize(
                file.getSize()
        );

        storedFile.setFilePath(
                targetLocation.toString()
        );

        storedFile.setOwnerEmail(
                ownerEmail
        );

        storedFile.setUploadedAt(
                LocalDateTime.now()
        );

        // New files are active
        storedFile.setDeletedAt(null);

        // =====================================================
        // ASSIGN FOLDER
        // =====================================================

        if (folderId != null) {

            Folder folder =
                    folderRepository
                            .findByIdAndOwnerEmail(
                                    folderId,
                                    ownerEmail
                            )
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Folder not found"
                                    )
                            );

            storedFile.setFolder(folder);
        }

        return fileRepository.save(storedFile);
    }

    // =========================================================
    // GET ALL ACTIVE FILES
    // =========================================================

    public List<StoredFile> getUserFiles(
            String ownerEmail) {

        return fileRepository
                .findByOwnerEmailAndDeletedAtIsNull(
                        ownerEmail
                );
    }

    // =========================================================
    // GET ACTIVE FILES INSIDE FOLDER
    // =========================================================

    public List<StoredFile> getUserFiles(
            String ownerEmail,
            Long folderId) {

        // Root folder
        if (folderId == null) {

            return fileRepository
                    .findByOwnerEmailAndFolderIsNullAndDeletedAtIsNull(
                            ownerEmail
                    );
        }

        // Specific folder
        return fileRepository
                .findByOwnerEmailAndFolderIdAndDeletedAtIsNull(
                        ownerEmail,
                        folderId
                );
    }

    // =========================================================
    // GET ACTIVE USER FILE
    // =========================================================

    public StoredFile getUserFile(
            Long id,
            String ownerEmail) {

        return fileRepository
                .findByIdAndOwnerEmailAndDeletedAtIsNull(
                        id,
                        ownerEmail
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "File not found"
                        )
                );
    }

    // =========================================================
    // GET ACTIVE FILE BY ID
    // =========================================================
    //
    // IMPORTANT:
    // Deleted files cannot be opened/downloaded using this method.
    //
    // This prevents deleted files from appearing in:
    // - Recent files
    // - Preview
    // - Download
    // - Normal file access
    //
    // =========================================================

    public StoredFile getFileById(
            Long id) {

        return fileRepository
                .findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "File not found"
                        )
                );
    }

    // =========================================================
    // GET FILE PATH FOR OWNER
    // =========================================================

    public Path getFilePath(
            Long id,
            String ownerEmail) {

        StoredFile file =
                getUserFile(
                        id,
                        ownerEmail
                );

        return getFilePath(file);
    }

    // =========================================================
    // GET FILE PATH FROM STORED FILE
    // =========================================================

    public Path getFilePath(
            StoredFile file) {

        if (file == null) {
            throw new RuntimeException("File not found");
        }

        // Deleted files cannot be accessed
        if (file.getDeletedAt() != null) {
            throw new RuntimeException(
                    "File is in Trash"
            );
        }

        Path path =
                Paths.get(
                        file.getFilePath()
                ).toAbsolutePath()
                 .normalize();

        // Security check
        if (!path.startsWith(storageLocation)) {
            throw new RuntimeException(
                    "Invalid file path"
            );
        }

        if (!Files.exists(path)) {
            throw new RuntimeException(
                    "File does not exist"
            );
        }

        return path;
    }

    // =========================================================
    // MOVE FILE TO TRASH
    // =========================================================
    //
    // The physical file is NOT deleted.
    //
    // deletedAt is set instead.
    //
    // =========================================================

    public void deleteFile(
            Long id,
            String ownerEmail) {

        StoredFile file =
                getUserFile(
                        id,
                        ownerEmail
                );

        // Already deleted
        if (file.getDeletedAt() != null) {
            throw new RuntimeException(
                    "File is already in Trash"
            );
        }

        // Move to Trash
        file.setDeletedAt(
                LocalDateTime.now()
        );

        fileRepository.save(file);
    }

    // =========================================================
    // GET TRASH FILES
    // =========================================================

    public List<StoredFile> getTrashFiles(
            String ownerEmail) {

        return fileRepository
                .findByOwnerEmailAndDeletedAtIsNotNull(
                        ownerEmail
                );
    }

    // =========================================================
    // RESTORE FILE FROM TRASH
    // =========================================================

    public void restoreFile(
            Long id,
            String ownerEmail) {

        StoredFile file =
                fileRepository
                        .findByIdAndOwnerEmail(
                                id,
                                ownerEmail
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "File not found"
                                )
                        );

        // File is not in Trash
        if (file.getDeletedAt() == null) {
            throw new RuntimeException(
                    "File is not in Trash"
            );
        }

        // Restore
        file.setDeletedAt(null);

        fileRepository.save(file);
    }

    // =========================================================
    // PERMANENTLY DELETE FILE
    // =========================================================
    //
    // Only files already in Trash can be permanently deleted.
    //
    // =========================================================

    public void permanentlyDeleteFile(
            Long id,
            String ownerEmail) throws IOException {

        StoredFile file =
                fileRepository
                        .findByIdAndOwnerEmail(
                                id,
                                ownerEmail
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "File not found"
                                )
                        );

        // Prevent permanent deletion of active files
        if (file.getDeletedAt() == null) {
            throw new RuntimeException(
                    "File must be in Trash before permanent deletion"
            );
        }

        Path path =
                Paths.get(
                        file.getFilePath()
                ).toAbsolutePath()
                 .normalize();

        // Security check
        if (!path.startsWith(storageLocation)) {
            throw new RuntimeException(
                    "Invalid file path"
            );
        }

        // Delete physical file
        Files.deleteIfExists(path);

        // Delete database record
        fileRepository.delete(file);
    }
}