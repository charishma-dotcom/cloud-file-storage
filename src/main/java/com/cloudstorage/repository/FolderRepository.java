package com.cloudstorage.repository;

import com.cloudstorage.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, Long> {

    List<Folder> findByOwnerEmailAndParentIsNull(String ownerEmail);

    List<Folder> findByOwnerEmailAndParentId(String ownerEmail, Long parentId);

    Optional<Folder> findByIdAndOwnerEmail(Long id, String ownerEmail);
}
