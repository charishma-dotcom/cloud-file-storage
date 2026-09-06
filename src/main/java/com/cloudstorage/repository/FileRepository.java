package com.cloudstorage.repository;

import com.cloudstorage.model.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<StoredFile, Long> {

    // =========================================================
    // ALL FILES OF A USER
    // =========================================================

    List<StoredFile> findByOwnerEmail(
            String ownerEmail
    );

    // =========================================================
    // FILES INSIDE A FOLDER
    // =========================================================

    List<StoredFile> findByOwnerEmailAndFolderId(
            String ownerEmail,
            Long folderId
    );

    // =========================================================
    // FILES IN ROOT DIRECTORY
    // =========================================================

    List<StoredFile> findByOwnerEmailAndFolderIsNull(
            String ownerEmail
    );

    // =========================================================
    // SEARCH FILES BY NAME
    // =========================================================

    List<StoredFile> findByOwnerEmailAndFileNameContainingIgnoreCase(
            String ownerEmail,
            String fileName
    );

    // =========================================================
    // FIND FILE BY ID AND OWNER
    // =========================================================

    Optional<StoredFile> findByIdAndOwnerEmail(
            Long id,
            String ownerEmail
    );

    // =========================================================
    // ACTIVE FILES
    // =========================================================

    List<StoredFile> findByOwnerEmailAndDeletedAtIsNull(
            String ownerEmail
    );

    // =========================================================
    // ACTIVE FILES INSIDE FOLDER
    // =========================================================

    List<StoredFile> findByOwnerEmailAndFolderIdAndDeletedAtIsNull(
            String ownerEmail,
            Long folderId
    );

    // =========================================================
    // ACTIVE ROOT FILES
    // =========================================================

    List<StoredFile> findByOwnerEmailAndFolderIsNullAndDeletedAtIsNull(
            String ownerEmail
    );

    // =========================================================
    // FIND ACTIVE FILE BY ID AND OWNER
    // =========================================================

    Optional<StoredFile> findByIdAndOwnerEmailAndDeletedAtIsNull(
            Long id,
            String ownerEmail
    );

    // =========================================================
    // FIND ANY ACTIVE FILE BY ID
    // =========================================================

    Optional<StoredFile> findByIdAndDeletedAtIsNull(
            Long id
    );

    // =========================================================
    // TRASH FILES
    // =========================================================

    List<StoredFile> findByOwnerEmailAndDeletedAtIsNotNull(
            String ownerEmail
    );
}