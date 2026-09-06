package com.cloudstorage.controller.file;

import com.cloudstorage.model.FileShare;
import com.cloudstorage.service.FileShareService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileShareController {

    private final FileShareService fileShareService;

    public FileShareController(FileShareService fileShareService) {
        this.fileShareService = fileShareService;
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<?> shareFile(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        String email = request.get("email");
        String permission = request.get("permission");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                    .body("Email is required");
        }

        if (permission == null || permission.isBlank()) {
            return ResponseEntity.badRequest()
                    .body("Permission is required");
        }

        try {
            FileShare share = fileShareService.shareFile(
                    id,
                    authentication.getName(),
                    email,
                    permission
            );

            return ResponseEntity.ok(share);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(e.getMessage());
        }
    }

    @GetMapping("/{id}/shares")
    public ResponseEntity<List<FileShare>> getFileShares(
            @PathVariable Long id,
            Authentication authentication) {

        return ResponseEntity.ok(
                fileShareService.getFileShares(
                        id,
                        authentication.getName()
                )
        );
    }

    @GetMapping("/shared")
    public ResponseEntity<List<FileShare>> getSharedFiles(
            Authentication authentication) {

        return ResponseEntity.ok(
                fileShareService.getSharedFiles(
                        authentication.getName()
                )
        );
    }

    @DeleteMapping("/{id}/share")
    public ResponseEntity<Void> removeShare(
            @PathVariable Long id,
            @RequestParam String email,
            Authentication authentication) {

        fileShareService.removeShare(
                id,
                authentication.getName(),
                email
        );

        return ResponseEntity.noContent().build();
    }
}
