package com.example.socialnetwork.dto.group;

import com.example.socialnetwork.entity.GroupMemberStatus;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GroupMemberResponse {
    private String userId;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private GroupMemberStatus status;
}
