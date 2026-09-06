package com.cloudstorage.service;

import com.cloudstorage.model.Folder;
import com.cloudstorage.repository.FolderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FolderService {

    private final FolderRepository folderRepository;

    public FolderService(FolderRepository folderRepository) {
        this.folderRepository = folderRepository;
    }

    public Folder createFolder(
            String name,
            Long parentId,
            String ownerEmail) {

        Folder folder = new Folder();

        folder.setName(name);
        folder.setOwnerEmail(ownerEmail);
        folder.setCreatedAt(LocalDateTime.now());

        if (parentId != null) {

            Folder parent = folderRepository
                    .findByIdAndOwnerEmail(parentId, ownerEmail)
                    .orElseThrow(() ->
                            new RuntimeException("Parent folder not found")
                    );

            folder.setParent(parent);
        }

        return folderRepository.save(folder);
    }

    public List<Folder> getFolders(
            Long parentId,
            String ownerEmail) {

        if (parentId == null) {
            return folderRepository
                    .findByOwnerEmailAndParentIsNull(ownerEmail);
        }

        return folderRepository
                .findByOwnerEmailAndParentId(
                        ownerEmail,
                        parentId
                );
    }

    public void deleteFolder(
            Long folderId,
            String ownerEmail) {

        Folder folder = folderRepository
                .findByIdAndOwnerEmail(folderId, ownerEmail)
                .orElseThrow(() ->
                        new RuntimeException("Folder not found")
                );

        folderRepository.delete(folder);
    }
}
