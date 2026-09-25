package com.example.socialnetwork.service;

import com.example.socialnetwork.dto.CommentResponse;
import com.example.socialnetwork.dto.CreateCommentRequest;
import com.example.socialnetwork.dto.ResponseDto;
import com.example.socialnetwork.dto.UpdateCommentRequest;
import com.example.socialnetwork.entity.Comment;
import com.example.socialnetwork.entity.Post;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.CommentRepository;
import com.example.socialnetwork.repository.PostRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final PostService postService;

    public CommentService(CommentRepository commentRepository,
                           PostRepository postRepository,
                           PostService postService) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.postService = postService;
    }

    // Liste les commentaires d'un post.
    // On ne les montre que si currentUser a le droit de voir le post lui-même.
    public List<CommentResponse> getCommentsForPost(String postId, User currentUser) {

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NoSuchElementException("Post introuvable"));

        if (!postService.canViewPost(post, currentUser)) {
            throw new AccessDeniedException("Tu n'as pas le droit de voir ce post");
        }

        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtDesc(postId);
        List<CommentResponse> result = new ArrayList<>();

        for (Comment comment : comments) {
            result.add(toResponse(comment));
        }

        return result;
    }

    // Crée un commentaire sur un post.
    // Même règle : il faut pouvoir voir le post pour pouvoir commenter dessus.
    public CommentResponse createComment(String postId, User currentUser, CreateCommentRequest req) {

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NoSuchElementException("Post introuvable"));

        if (!postService.canViewPost(post, currentUser)) {
            throw new AccessDeniedException("Tu n'as pas le droit de commenter ce post");
        }

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthor(currentUser);
        comment.setContent(req.getContent());
        comment.setImageUrl(req.getImageUrl());

        comment = commentRepository.save(comment);

        // // On recharge depuis la base pour récupérer created_at,
        // // généré automatiquement par SQLite
        // Comment savedComment = commentRepository.findById(comment.getId()).orElseThrow();

        return toResponse(comment);
    }

    // Modifie un commentaire existant. Seul son auteur a le droit de le faire.
    public CommentResponse updateComment(String commentId, User currentUser, UpdateCommentRequest req) {

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NoSuchElementException("Commentaire introuvable"));

        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Tu ne peux modifier que tes propres commentaires");
        }

        if (req.getContent() != null) {
            comment.setContent(req.getContent());
        }

        if (req.getImageUrl() != null) {
            comment.setImageUrl(req.getImageUrl());
        }

        comment = commentRepository.save(comment);

        return toResponse(comment);
    }

    // Supprime un commentaire. Seul son auteur a le droit de le faire.
    public ResponseDto deleteComment(String commentId, User currentUser) {

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NoSuchElementException("Commentaire introuvable"));

        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Tu ne peux supprimer que tes propres commentaires");
        }

        commentRepository.delete(comment);

        return new ResponseDto(commentId, "Comment has been deleted successfully");
    }

    // Transforme un Comment (entité base de données) en CommentResponse (pour le frontend)
    private CommentResponse toResponse(Comment comment) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setPostId(comment.getPost().getId());
        response.setContent(comment.getContent());
        response.setImageUrl(comment.getImageUrl());
        response.setCreatedAt(comment.getCreatedAt());
        response.setAuthorId(comment.getAuthor().getId());
        response.setAuthorFirstName(comment.getAuthor().getFirstName());
        response.setAuthorLastName(comment.getAuthor().getLastName());
        response.setAuthorAvatarUrl(comment.getAuthor().getAvatarUrl());
        return response;
    }
}