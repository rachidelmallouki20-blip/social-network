package com.example.socialnetwork.controller;

import com.example.socialnetwork.dto.ImageUploadResponse;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.security.CurrentUserService;
import com.example.socialnetwork.service.FileStorageService;
import com.example.socialnetwork.service.GroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class PostImageController {

    private final FileStorageService fileStorageService;
    private final GroupService groupService;
    private final CurrentUserService currentUserService;

    public PostImageController(FileStorageService fileStorageService,
            GroupService groupService,
            CurrentUserService currentUserService) {
        this.fileStorageService = fileStorageService;
        this.groupService = groupService;
        this.currentUserService = currentUserService;
    }

    // Upload d'une image pour un post personnel (utilisateur connecté).
    @PostMapping(value = "/posts/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse uploadPostImage(@RequestParam("file") MultipartFile file) {
        String imageUrl = fileStorageService.storePostImage(file);
        return new ImageUploadResponse(imageUrl);
    }

    // Upload d'une image pour un post de groupe (membres acceptés uniquement).
    @PostMapping(value = "/groups/{groupId}/posts/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse uploadGroupPostImage(
            @PathVariable String groupId,
            @RequestParam("file") MultipartFile file
    ) {
        User currentUser = currentUserService.getCurrentUser();

        if (!groupService.isAcceptedMember(groupId, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu n'es pas membre de ce groupe");
        }

        String imageUrl = fileStorageService.storePostImage(file);
        return new ImageUploadResponse(imageUrl);
    }
}
