package com.example.socialnetwork.repository;

import com.example.socialnetwork.entity.PostAllowedViewer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostAllowedViewerRepository extends JpaRepository<PostAllowedViewer, String> {

    boolean existsByPostIdAndUserId(String postId, String userId);

    List<PostAllowedViewer> findByPostId(String postId);

    // Suppression bulk exécutée immédiatement (évite l'ordre insert/delete d'Hibernate
    // qui violerait la contrainte UNIQUE(post_id, user_id) lors d'un nouvel enregistrement)
    @Modifying
    @Query("DELETE FROM PostAllowedViewer v WHERE v.postId = :postId")
    void deleteByPostId(@Param("postId") String postId);
}