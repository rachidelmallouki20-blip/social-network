package com.example.socialnetwork.dto.event;

import lombok.Getter;
import lombok.Setter;


@Getter
@Setter
public class CreateEventRequest {
    private String title;
    private String description;
    private String eventTime;
}
