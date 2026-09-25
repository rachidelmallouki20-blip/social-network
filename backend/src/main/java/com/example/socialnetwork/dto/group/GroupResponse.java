package com.example.socialnetwork.dto.group;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GroupResponse {
    private String id;
    private String title;
    private String description;
    private String creatorId;
    private String creatorName;
    private Long memberCount;
    private String myStatus;
    private String createdAt;
}
