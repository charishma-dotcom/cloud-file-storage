package com.cloudstorage.service;

import com.cloudstorage.model.PublicShareLink;
import com.cloudstorage.model.StoredFile;
import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.PublicShareLinkRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PublicShareLinkService {

    private final PublicShareLinkRepository publicShareLinkRepository;
    private final FileRepository fileRepository;
    private final PasswordEncoder passwordEncoder;

    public PublicShareLinkService(
            PublicShareLinkRepository publicShareLinkRepository,
            FileRepository fileRepository,
            PasswordEncoder passwordEncoder) {

        this.publicShareLinkRepository = publicShareLinkRepository;
        this.fileRepository = fileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public PublicShareLink createLink(
            Long fileId,
            String ownerEmail,
            LocalDateTime expiresAt,
            String password) {

        StoredFile file = fileRepository.findByIdAndOwnerEmail(fileId, ownerEmail)
                .orElseThrow(() -> new RuntimeException("File not found"));

        PublicShareLink link = new PublicShareLink();

        link.setToken(UUID.randomUUID().toString());
        link.setFile(file);
        link.setOwnerEmail(ownerEmail);
        link.setExpiresAt(expiresAt);
        link.setActive(true);

        if (password != null && !password.isBlank()) {
            link.setPassword(passwordEncoder.encode(password));
        }

        return publicShareLinkRepository.save(link);
    }

    public List<PublicShareLink> getOwnerLinks(String ownerEmail) {
        return publicShareLinkRepository.findByOwnerEmail(ownerEmail);
    }

    public PublicShareLink getValidLink(String token) {

        PublicShareLink link = publicShareLinkRepository
                .findByTokenAndActiveTrue(token)
                .orElseThrow(() -> new RuntimeException("Share link not found or disabled"));

        if (link.getExpiresAt() != null &&
                link.getExpiresAt().isBefore(LocalDateTime.now())) {

            link.setActive(false);
            publicShareLinkRepository.save(link);

            throw new RuntimeException("Share link has expired");
        }

        return link;
    }

    public boolean verifyPassword(
            PublicShareLink link,
            String password) {

        if (link.getPassword() == null ||
                link.getPassword().isBlank()) {

            return true;
        }

        if (password == null || password.isBlank()) {
            return false;
        }

        return passwordEncoder.matches(
                password,
                link.getPassword()
        );
    }

    public void disableLink(Long linkId, String ownerEmail) {

        PublicShareLink link = publicShareLinkRepository
                .findById(linkId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        if (!link.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            throw new RuntimeException("You do not have permission");
        }

        link.setActive(false);
        publicShareLinkRepository.save(link);
    }
}
