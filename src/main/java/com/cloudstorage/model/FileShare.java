package com.cloudstorage.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "file_shares",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_file_shared_email",
                        columnNames = {
                                "file_id",
                                "shared_with_email"
                        }
                )
        }
)
public class FileShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "file_id",
            nullable = false
    )
    @JsonIgnore
    private StoredFile file;

    @Column(
            nullable = false,
            length = 255
    )
    private String sharedWithEmail;

    @Column(
            nullable = false,
            length = 20
    )
    private String permission;

    @Column(nullable = false)
    private LocalDateTime sharedAt;

    public FileShare() {
    }

    // =========================================================
    // GET ID
    // =========================================================

    public Long getId() {
        return id;
    }

    // =========================================================
    // GET FILE
    // =========================================================

    @JsonIgnore
    public StoredFile getFile() {
        return file;
    }

    // =========================================================
    // SET FILE
    // =========================================================

    public void setFile(StoredFile file) {
        this.file = file;
    }

    // =========================================================
    // GET SHARED WITH EMAIL
    // =========================================================

    public String getSharedWithEmail() {
        return sharedWithEmail;
    }

    // =========================================================
    // SET SHARED WITH EMAIL
    // =========================================================

    public void setSharedWithEmail(String sharedWithEmail) {
        this.sharedWithEmail = sharedWithEmail;
    }

    // =========================================================
    // GET PERMISSION
    // =========================================================

    public String getPermission() {
        return permission;
    }

    // =========================================================
    // SET PERMISSION
    // =========================================================

    public void setPermission(String permission) {
        this.permission = permission;
    }

    // =========================================================
    // GET SHARED AT
    // =========================================================

    public LocalDateTime getSharedAt() {
        return sharedAt;
    }

    // =========================================================
    // SET SHARED AT
    // =========================================================

    public void setSharedAt(LocalDateTime sharedAt) {
        this.sharedAt = sharedAt;
    }
}