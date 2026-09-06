package com.cloudstorage.controller.folder;

import com.cloudstorage.model.Folder;
import com.cloudstorage.service.FolderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @PostMapping
    public ResponseEntity<?> createFolder(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {

        try {
            if (authentication == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "User is not authenticated"
                        ));
            }

            String name = null;

            if (request.get("name") != null) {
                name = request.get("name")
                        .toString()
                        .trim();
            }

            if (name == null || name.isBlank()) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "message",
                                "Folder name is required"
                        ));
            }

            Long parentId = null;

            if (request.get("parentId") != null) {
                parentId = Long.valueOf(
                        request.get("parentId").toString()
                );
            }

            String ownerEmail =
                    authentication.getName();

            Folder folder =
                    folderService.createFolder(
                            name,
                            parentId,
                            ownerEmail
                    );

            Map<String, Object> response =
                    new HashMap<>();

            response.put("id", folder.getId());
            response.put("name", folder.getName());
            response.put(
                    "ownerEmail",
                    folder.getOwnerEmail()
            );
            response.put(
                    "createdAt",
                    folder.getCreatedAt()
            );

            if (folder.getParent() != null) {
                response.put(
                        "parentId",
                        folder.getParent().getId()
                );
            } else {
                response.put("parentId", null);
            }

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (NumberFormatException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "Invalid parent folder ID"
                    ));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage() != null
                                    ? e.getMessage()
                                    : "Unable to create folder"
                    ));

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(Map.of(
                            "message",
                            "Server error while creating folder"
                    ));
        }
    }

    @GetMapping
    public ResponseEntity<List<Folder>> getFolders(
            @RequestParam(required = false) Long parentId,
            Authentication authentication) {

        String ownerEmail =
                authentication.getName();

        return ResponseEntity.ok(
                folderService.getFolders(
                        parentId,
                        ownerEmail
                )
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFolder(
            @PathVariable Long id,
            Authentication authentication) {

        try {
            String ownerEmail =
                    authentication.getName();

            folderService.deleteFolder(
                    id,
                    ownerEmail
            );

            return ResponseEntity.noContent()
                    .build();

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }
    }
}