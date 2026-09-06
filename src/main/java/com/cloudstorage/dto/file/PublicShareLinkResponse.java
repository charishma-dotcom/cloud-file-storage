package com.cloudstorage.dto.file;

import com.cloudstorage.model.PublicShareLink;

import java.time.LocalDateTime;

public class PublicShareLinkResponse {

    private Long id;
    private String token;
    private String fileName;
    private Long fileId;
    private LocalDateTime expiresAt;
    private boolean active;
    private LocalDateTime createdAt;

    public PublicShareLinkResponse() {
    }

    public PublicShareLinkResponse(PublicShareLink link) {

        this.id = link.getId();

        this.token = link.getToken();

        this.fileName =
                link.getFile().getFileName();

        this.fileId =
                link.getFile().getId();

        this.expiresAt =
                link.getExpiresAt();

        this.active =
                link.isActive();

        this.createdAt =
                link.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public String getToken() {
        return token;
    }

    public String getFileName() {
        return fileName;
    }

    public Long getFileId() {
        return fileId;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public boolean isActive() {
        return active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}