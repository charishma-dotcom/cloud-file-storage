package com.cloudstorage.controller.file;
import com.cloudstorage.dto.file.PublicShareLinkResponse;
import com.cloudstorage.model.PublicShareLink;
import com.cloudstorage.model.StoredFile;
import com.cloudstorage.service.FileService;
import com.cloudstorage.service.PublicShareLinkService;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PublicShareLinkController {

    private final PublicShareLinkService publicShareLinkService;
    private final FileService fileService;

    public PublicShareLinkController(
            PublicShareLinkService publicShareLinkService,
            FileService fileService) {

        this.publicShareLinkService = publicShareLinkService;
        this.fileService = fileService;
    }

    // =========================================================
    // CREATE PUBLIC LINK
    // =========================================================

    @PostMapping("/files/{id}/public-link")
    public ResponseEntity<?> createLink(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        System.out.println(">>> PUBLIC LINK CONTROLLER REACHED <<<");

        try {

            String ownerEmail = authentication.getName();

            LocalDateTime expiresAt = null;

            String expiry = request.get("expiresAt");

            if (expiry != null && !expiry.isBlank()) {
                expiresAt = LocalDateTime.parse(expiry);
            }

            String password = request.get("password");

            PublicShareLink link =
                    publicShareLinkService.createLink(
                            id,
                            ownerEmail,
                            expiresAt,
                            password
                    );

            return ResponseEntity.ok(
        new PublicShareLinkResponse(link)
);
        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET OWNER'S PUBLIC LINKS
    // =========================================================

    @GetMapping("/files/public-links")
    public ResponseEntity<List<PublicShareLink>> getOwnerLinks(
            Authentication authentication) {

        String ownerEmail = authentication.getName();

        return ResponseEntity.ok(
                publicShareLinkService.getOwnerLinks(ownerEmail)
        );
    }

    // =========================================================
    // DISABLE PUBLIC LINK
    // =========================================================

    @DeleteMapping("/files/public-link/{linkId}")
    public ResponseEntity<?> disableLink(
            @PathVariable Long linkId,
            Authentication authentication) {

        try {

            String ownerEmail = authentication.getName();

            publicShareLinkService.disableLink(
                    linkId,
                    ownerEmail
            );

            return ResponseEntity.ok(
                    Map.of("message", "Public link disabled")
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(403)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // VIEW PUBLIC FILE INFORMATION
    // =========================================================

    @GetMapping("/public/{token}")
    public ResponseEntity<?> getPublicFile(
            @PathVariable String token) {

        try {

            PublicShareLink link =
                    publicShareLinkService.getValidLink(token);

            StoredFile file = link.getFile();

            return ResponseEntity.ok(
                    Map.of(
                            "fileName", file.getFileName(),
                            "fileSize", file.getFileSize(),
                            "fileType",
                            file.getFileType() == null
                                    ? "application/octet-stream"
                                    : file.getFileType(),
                            "requiresPassword",
                            link.getPassword() != null
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DOWNLOAD PUBLIC FILE
    // =========================================================

    @PostMapping("/public/{token}/download")
    public ResponseEntity<?> downloadPublicFile(
            @PathVariable String token,
            @RequestParam(required = false) String password) {

        try {

            // Check whether link exists, is active,
            // and has not expired.
            PublicShareLink link =
                    publicShareLinkService.getValidLink(token);

            // Verify password.
            if (!publicShareLinkService.verifyPassword(
                    link,
                    password)) {

                return ResponseEntity
                        .status(401)
                        .body("Invalid password");
            }

            // Get file.
            StoredFile file = link.getFile();

            // Get physical file path.
            Path path = fileService.getFilePath(file);

            Resource resource =
                    new UrlResource(path.toUri());

            if (!resource.exists()) {

                return ResponseEntity
                        .notFound()
                        .build();
            }

            // Determine content type.
            String contentType = file.getFileType();

            if (contentType == null ||
                    contentType.isBlank()) {

                contentType =
                        "application/octet-stream";
            }

            return ResponseEntity
                    .ok()
                    .contentType(
                            MediaType.parseMediaType(
                                    contentType
                            )
                    )
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" +
                                    file.getFileName() +
                                    "\""
                    )
                    .body(resource);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());

        } catch (Exception e) {

            return ResponseEntity
                    .internalServerError()
                    .body("Unable to download file");
        }
    }
}