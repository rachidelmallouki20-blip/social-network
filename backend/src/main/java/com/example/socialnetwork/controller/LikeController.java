package com.example.socialnetwork.controller;

import com.example.socialnetwork.entity.Like;
import com.example.socialnetwork.entity.Post;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.LikeRepository;
import com.example.socialnetwork.repository.PostRepository;
import com.example.socialnetwork.security.CurrentUserService;
import com.example.socialnetwork.service.PostService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.NoSuchElementException;
import java.util.Optional;

@RestController
@RequestMapping("/api/posts")
public class LikeController {

    private final LikeRepository likeRepository;
    private final PostRepository postRepository;
    private final CurrentUserService currentUserService;
    private final PostService postService;

    public LikeController(LikeRepository likeRepository,
                          PostRepository postRepository,
                          CurrentUserService currentUserService,
                          PostService postService) {
        this.likeRepository = likeRepository;
        this.postRepository = postRepository;
        this.currentUserService = currentUserService;
        this.postService = postService;
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<Void> toggleLike(@PathVariable String postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NoSuchElementException("Post introuvable"));

        User currentUser = currentUserService.getCurrentUser();

        // Un post de groupe n'est likable que par les membres acceptés du groupe
        if (!postService.canViewPost(post, currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu n'as pas accès à ce post");
        }

        Optional<Like> existingLike = likeRepository.findByPostIdAndUserId(postId, currentUser.getId());

        if (existingLike.isPresent()) {
            likeRepository.delete(existingLike.get()); // Unlike
        } else {
            Like like = new Like();
            like.setPostId(postId);
            like.setUserId(currentUser.getId());
            likeRepository.save(like); // Like
        }
        return ResponseEntity.ok().build();
    }
}
