package com.cloudstorage.repository;

import com.cloudstorage.model.PublicShareLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PublicShareLinkRepository extends JpaRepository<PublicShareLink, Long> {

    Optional<PublicShareLink> findByToken(String token);

    List<PublicShareLink> findByOwnerEmail(String ownerEmail);

    Optional<PublicShareLink> findByTokenAndActiveTrue(String token);
}
