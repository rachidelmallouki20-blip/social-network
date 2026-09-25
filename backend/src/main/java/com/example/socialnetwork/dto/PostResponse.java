package com.example.socialnetwork.dto;

import com.example.socialnetwork.entity.PostPrivacy;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PostResponse {

    private String id;
    //
    private String groupId;
    //
    private String content;

    private String imageUrl;

    private PostPrivacy privacy;

    // Rempli uniquement si privacy == PRIVATE
    private List<String> allowedViewerIds;

    private String authorId;

    private String authorFirstName;

    private String authorLastName;

    private String authorAvatarUrl;

    private long likesCount;
    
    private boolean likedByMe;

    private long commentsCount;

    private String createdAt;
}