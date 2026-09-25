package com.example.socialnetwork.repository;

import com.example.socialnetwork.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, String> {

    // Renvoie tous les commentaires d'un post, du plus récent au plus ancien
    List<Comment> findByPostIdOrderByCreatedAtDesc(String postId);

    // Compte le nombre de commentaires d'un post
    long countByPostId(String postId);
}