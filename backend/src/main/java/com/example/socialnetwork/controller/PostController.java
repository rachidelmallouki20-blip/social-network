package com.example.socialnetwork.controller;

import com.example.socialnetwork.dto.CreatePostRequest;
import com.example.socialnetwork.dto.PostResponse;
import com.example.socialnetwork.dto.UpdatePostRequest;
import com.example.socialnetwork.security.CurrentUserService;
import com.example.socialnetwork.service.PostService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PostController {

    private final PostService postService;
    private final CurrentUserService currentUserService;

    public PostController(PostService postService, CurrentUserService currentUserService) {
        this.postService = postService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/users/{userId}/posts")
    public List<PostResponse> getUserPosts(@PathVariable String userId) {
        return postService.getUserPosts(userId, currentUserService.getCurrentUser());
    }

    @PostMapping("/posts")
    public PostResponse createPost(@RequestBody CreatePostRequest req) {
        return postService.createPost(currentUserService.getCurrentUser(), req);
    }

    @PutMapping("/posts/{postId}")
    public PostResponse updatePost(
            @PathVariable String postId,
            @RequestBody UpdatePostRequest req
    ) {
        return postService.updatePost(postId, currentUserService.getCurrentUser(), req);
    }

    @DeleteMapping("/posts/{postId}")
    public void deletePost(@PathVariable String postId) {
        postService.deletePost(postId, currentUserService.getCurrentUser());
    }

    @PostMapping("/groups/{groupId}/posts")
    public PostResponse createGroupPost(
            @PathVariable String groupId,
            @RequestBody CreatePostRequest req
    ) {
        return postService.createGroupPost(groupId, currentUserService.getCurrentUser(), req);
    }

    @GetMapping("/groups/{groupId}/posts")
    public List<PostResponse> getGroupPosts(@PathVariable String groupId) {
        return postService.getGroupPosts(groupId, currentUserService.getCurrentUser());
    }
}
