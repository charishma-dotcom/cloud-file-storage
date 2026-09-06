package com.cloudstorage.controller.file;

import com.cloudstorage.model.StoredFile;
import com.cloudstorage.service.FileService;
import com.cloudstorage.service.FileShareService;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;
    private final FileShareService fileShareService;

    public FileController(
            FileService fileService,
            FileShareService fileShareService) {

        this.fileService = fileService;
        this.fileShareService = fileShareService;
    }

    // =========================================================
    // UPLOAD FILE
    // =========================================================

    @PostMapping("/upload")
    public ResponseEntity<StoredFile> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) Long folderId,
            Authentication authentication) throws Exception {

        String email = authentication.getName();

        StoredFile uploadedFile =
                fileService.uploadFile(
                        file,
                        email,
                        folderId
                );

        return ResponseEntity.ok(uploadedFile);
    }

    // =========================================================
    // LIST ACTIVE FILES
    // =========================================================
    //
    // Deleted files are automatically excluded by FileService.
    //
    // GET:
    // /api/files
    //
    // OR:
    // /api/files?folderId=5
    //
    // =========================================================

    @GetMapping
    public ResponseEntity<List<StoredFile>> listFiles(
            @RequestParam(value = "folderId", required = false)
            Long folderId,
            Authentication authentication) {

        String email = authentication.getName();

        List<StoredFile> files =
                fileService.getUserFiles(
                        email,
                        folderId
                );

        return ResponseEntity.ok(files);
    }

    // =========================================================
    // GET TRASH FILES
    // =========================================================
    //
    // GET:
    // /api/files/trash
    //
    // Only deleted files are returned.
    //
    // =========================================================

    @GetMapping("/trash")
    public ResponseEntity<List<StoredFile>> getTrash(
            Authentication authentication) {

        String email = authentication.getName();

        List<StoredFile> trashFiles =
                fileService.getTrashFiles(email);

        return ResponseEntity.ok(trashFiles);
    }

    // =========================================================
    // RESTORE FILE
    // =========================================================
    //
    // PUT:
    // /api/files/{id}/restore
    //
    // =========================================================

    @PutMapping("/{id}/restore")
    public ResponseEntity<String> restore(
            @PathVariable Long id,
            Authentication authentication) {

        String email = authentication.getName();

        try {

            fileService.restoreFile(
                    id,
                    email
            );

            return ResponseEntity.ok(
                    "File restored successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // PERMANENTLY DELETE FILE
    // =========================================================
    //
    // DELETE:
    // /api/files/{id}/permanent
    //
    // This should only be used for files already in Trash.
    //
    // =========================================================

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<String> permanentlyDelete(
            @PathVariable Long id,
            Authentication authentication) {

        String email = authentication.getName();

        try {

            fileService.permanentlyDeleteFile(
                    id,
                    email
            );

            return ResponseEntity.ok(
                    "File permanently deleted"
            );

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // MOVE FILE TO TRASH
    // =========================================================
    //
    // DELETE:
    // /api/files/{id}
    //
    // IMPORTANT:
    // The physical file is NOT deleted.
    //
    // deletedAt is set in FileService.
    //
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(
            @PathVariable Long id,
            Authentication authentication) {

        String email = authentication.getName();

        // Check whether current user can edit/delete the file
        if (!fileShareService.canEdit(id, email)) {

            return ResponseEntity
                    .status(403)
                    .body(
                            "You do not have permission to delete this file"
                    );
        }

        try {

            // Get actual owner of the file
            String ownerEmail =
                    fileShareService.getFileOwnerEmail(id);

            // Move the owner's file to Trash
            fileService.deleteFile(
                    id,
                    ownerEmail
            );

            return ResponseEntity.ok(
                    "File moved to trash"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ACTIVE FILE
    // =========================================================
    //
    // GET:
    // /api/files/{id}
    //
    // Deleted files cannot be opened.
    //
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<StoredFile> getFile(
            @PathVariable Long id,
            Authentication authentication) {

        String email = authentication.getName();

        // Check VIEW permission
        if (!fileShareService.canView(id, email)) {

            return ResponseEntity
                    .status(403)
                    .build();
        }

        try {

            StoredFile file =
                    fileService.getFileById(id);

            return ResponseEntity.ok(file);

        } catch (RuntimeException e) {

            // Deleted or non-existing file
            return ResponseEntity
                    .notFound()
                    .build();
        }
    }

    // =========================================================
    // DOWNLOAD ACTIVE FILE
    // =========================================================
    //
    // GET:
    // /api/files/{id}/download
    //
    // Deleted files cannot be downloaded.
    //
    // =========================================================

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(
            @PathVariable Long id,
            Authentication authentication) throws Exception {

        String email = authentication.getName();

        // Check VIEW permission
        if (!fileShareService.canView(id, email)) {

            return ResponseEntity
                    .status(403)
                    .build();
        }

        StoredFile file;

        try {

            file =
                    fileService.getFileById(id);

        } catch (RuntimeException e) {

            // File is deleted or does not exist
            return ResponseEntity
                    .notFound()
                    .build();
        }

        Path path;

        try {

            path =
                    fileService.getFilePath(file);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        Resource resource =
                new UrlResource(
                        path.toUri()
                );

        if (!resource.exists() ||
                !resource.isReadable()) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        // =====================================================
        // CONTENT TYPE
        // =====================================================

        String contentType =
                file.getFileType();

        if (contentType == null ||
                contentType.isBlank()) {

            contentType =
                    "application/octet-stream";
        }

        MediaType mediaType;

        try {

            mediaType =
                    MediaType.parseMediaType(
                            contentType
                    );

        } catch (Exception e) {

            mediaType =
                    MediaType.APPLICATION_OCTET_STREAM;
        }

        // =====================================================
        // RETURN FILE
        // =====================================================

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" +
                                file.getFileName() +
                                "\""
                )
                .body(resource);
    }
}