package com.cloudstorage.repository;

import com.cloudstorage.model.FileShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileShareRepository extends JpaRepository<FileShare, Long> {

    // Files shared with a user
    List<FileShare> findBySharedWithEmail(String email);

    // All shares for a file
    List<FileShare> findByFileId(Long fileId);

    // Find a specific share
    Optional<FileShare> findByFileIdAndSharedWithEmail(
            Long fileId,
            String email
    );

    // Delete a specific share
    void deleteByFileIdAndSharedWithEmail(
            Long fileId,
            String email
    );

    // Delete all shares for a file
    void deleteByFileId(Long fileId);
}