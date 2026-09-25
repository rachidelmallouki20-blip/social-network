package com.example.socialnetwork.dto.event;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EventResponseDto {
    private String id;
    private String  groupId;
    private String title;
    private String description;
    private String eventTime;
    private String creatorId;
    private Long goingCount;
    private Long notGoingCount;
    private String myResponse;
    private String createdAt;
}
