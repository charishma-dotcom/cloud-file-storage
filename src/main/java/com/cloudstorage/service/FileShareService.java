package com.cloudstorage.service;

import com.cloudstorage.model.FileShare;
import com.cloudstorage.model.StoredFile;
import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.FileShareRepository;
import com.cloudstorage.repository.UserRepository;

import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class FileShareService {

    private final FileShareRepository fileShareRepository;
    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public FileShareService(
            FileShareRepository fileShareRepository,
            FileRepository fileRepository,
            UserRepository userRepository,
            EmailService emailService) {

        this.fileShareRepository =
                fileShareRepository;

        this.fileRepository =
                fileRepository;

        this.userRepository =
                userRepository;

        this.emailService =
                emailService;
    }

    // =========================================================
    // SHARE FILE
    // =========================================================

    public FileShare shareFile(
            Long fileId,
            String ownerEmail,
            String sharedWithEmail,
            String permission) {

        // -----------------------------------------------------
        // Validate owner email
        // -----------------------------------------------------

        if (ownerEmail == null ||
                ownerEmail.isBlank()) {

            throw new RuntimeException(
                    "Owner email is required"
            );
        }

        // -----------------------------------------------------
        // Validate recipient email
        // -----------------------------------------------------

        if (sharedWithEmail == null ||
                sharedWithEmail.isBlank()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        String normalizedEmail =
                sharedWithEmail
                        .trim()
                        .toLowerCase(Locale.ROOT);

        String normalizedOwnerEmail =
                ownerEmail
                        .trim()
                        .toLowerCase(Locale.ROOT);

        // -----------------------------------------------------
        // Validate permission
        // -----------------------------------------------------

        if (permission == null ||
                permission.isBlank()) {

            throw new RuntimeException(
                    "Permission is required"
            );
        }

        String normalizedPermission =
                permission
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if (!normalizedPermission.equals("VIEWER") &&
                !normalizedPermission.equals("EDITOR")) {

            throw new RuntimeException(
                    "Permission must be VIEWER or EDITOR"
            );
        }

        // -----------------------------------------------------
        // Find file owned by current user
        // -----------------------------------------------------

        StoredFile file =
                fileRepository
                        .findByIdAndOwnerEmail(
                                fileId,
                                ownerEmail
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "File not found"
                                )
                        );

        // -----------------------------------------------------
        // Do not share deleted files
        // -----------------------------------------------------

        if (file.getDeletedAt() != null) {

            throw new RuntimeException(
                    "File is in Trash and cannot be shared"
            );
        }

        // -----------------------------------------------------
        // Cannot share with yourself
        // -----------------------------------------------------

        if (normalizedOwnerEmail.equals(
                normalizedEmail)) {

            throw new RuntimeException(
                    "You cannot share a file with yourself"
            );
        }

        // -----------------------------------------------------
        // Recipient must exist
        // -----------------------------------------------------

        if (!userRepository.existsByEmail(
                normalizedEmail)) {

            throw new RuntimeException(
                    "User does not exist"
            );
        }

        // -----------------------------------------------------
        // Find existing share
        // -----------------------------------------------------

        FileShare share =
                fileShareRepository
                        .findByFileIdAndSharedWithEmail(
                                fileId,
                                normalizedEmail
                        )
                        .orElseGet(
                                FileShare::new
                        );

        // -----------------------------------------------------
        // Update share
        // -----------------------------------------------------

        share.setFile(file);

        share.setSharedWithEmail(
                normalizedEmail
        );

        share.setPermission(
                normalizedPermission
        );

        if (share.getSharedAt() == null) {

            share.setSharedAt(
                    LocalDateTime.now()
            );
        }

        // -----------------------------------------------------
        // Save share
        // -----------------------------------------------------

        FileShare savedShare =
                fileShareRepository.save(share);

        // -----------------------------------------------------
        // Send email notification
        // -----------------------------------------------------

        try {

            emailService.sendFileShareEmail(
                    normalizedEmail,
                    file.getFileName(),
                    normalizedPermission,
                    ownerEmail
            );

        } catch (MailException e) {

            System.err.println(
                    "===================================="
            );

            System.err.println(
                    "FILE SHARE EMAIL FAILED"
            );

            System.err.println(
                    "Recipient: " +
                            normalizedEmail
            );

            System.err.println(
                    "File: " +
                            file.getFileName()
            );

            System.err.println(
                    "Permission: " +
                            normalizedPermission
            );

            System.err.println(
                    "Error: " +
                            e.getMessage()
            );

            System.err.println(
                    "===================================="
            );

        } catch (Exception e) {

            System.err.println(
                    "Unexpected email error: " +
                            e.getMessage()
            );
        }

        // -----------------------------------------------------
        // Return saved share
        // -----------------------------------------------------

        return savedShare;
    }

    // =========================================================
    // GET SHARES FOR A FILE
    // =========================================================

    public List<FileShare> getFileShares(
            Long fileId,
            String ownerEmail) {

        StoredFile file =
                fileRepository
                        .findByIdAndOwnerEmail(
                                fileId,
                                ownerEmail
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "File not found"
                                )
                        );

        // Deleted files do not expose active shares
        if (file.getDeletedAt() != null) {

            throw new RuntimeException(
                    "File is in Trash"
            );
        }

        return fileShareRepository
                .findByFileId(fileId);
    }

    // =========================================================
    // GET FILES SHARED WITH CURRENT USER
    // =========================================================

    public List<FileShare> getSharedFiles(
            String email) {

        return fileShareRepository
                .findBySharedWithEmail(
                        email
                )
                .stream()
                .filter(share ->
                        share.getFile() != null &&
                        share.getFile().getDeletedAt() == null
                )
                .toList();
    }

    // =========================================================
    // REMOVE SHARE
    // =========================================================

    public void removeShare(
            Long fileId,
            String ownerEmail,
            String sharedWithEmail) {

        if (sharedWithEmail == null ||
                sharedWithEmail.isBlank()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        String normalizedEmail =
                sharedWithEmail
                        .trim()
                        .toLowerCase(Locale.ROOT);

        // -----------------------------------------------------
        // Verify owner
        // -----------------------------------------------------

        StoredFile file =
                fileRepository
                        .findByIdAndOwnerEmail(
                                fileId,
                                ownerEmail
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "File not found"
                                )
                        );

        if (file.getDeletedAt() != null) {

            throw new RuntimeException(
                    "File is in Trash"
            );
        }

        // -----------------------------------------------------
        // Verify share exists
        // -----------------------------------------------------

        FileShare share =
                fileShareRepository
                        .findByFileIdAndSharedWithEmail(
                                fileId,
                                normalizedEmail
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Share not found"
                                )
                        );

        // -----------------------------------------------------
        // Remove share
        // -----------------------------------------------------

        fileShareRepository.delete(share);
    }

    // =========================================================
    // GET PERMISSION
    // =========================================================

    public String getPermission(
            Long fileId,
            String email) {

        StoredFile file =
                fileRepository
                        .findById(fileId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "File not found"
                                )
                        );

        // -----------------------------------------------------
        // Deleted files have no active permission
        // -----------------------------------------------------

        if (file.getDeletedAt() != null) {

            return null;
        }

        // -----------------------------------------------------
        // Owner
        // -----------------------------------------------------

        if (file.getOwnerEmail()
                .equalsIgnoreCase(email)) {

            return "OWNER";
        }

        // -----------------------------------------------------
        // Shared permission
        // -----------------------------------------------------

        return fileShareRepository
                .findByFileIdAndSharedWithEmail(
                        fileId,
                        email
                )
                .map(FileShare::getPermission)
                .orElse(null);
    }

    // =========================================================
    // CAN VIEW
    // =========================================================

    public boolean canView(
            Long fileId,
            String email) {

        String permission =
                getPermission(
                        fileId,
                        email
                );

        return "OWNER".equals(permission)
                || "VIEWER".equals(permission)
                || "EDITOR".equals(permission);
    }

    // =========================================================
    // CAN EDIT
    // =========================================================

    public boolean canEdit(
            Long fileId,
            String email) {

        String permission =
                getPermission(
                        fileId,
                        email
                );

        return "OWNER".equals(permission)
                || "EDITOR".equals(permission);
    }

    // =========================================================
    // GET FILE OWNER
    // =========================================================

    public String getFileOwnerEmail(
            Long fileId) {

        return fileRepository
                .findById(fileId)
                .map(
                        StoredFile::getOwnerEmail
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "File not found"
                        )
                );
    }
}