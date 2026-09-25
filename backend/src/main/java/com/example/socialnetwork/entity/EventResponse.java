package com.example.socialnetwork.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "event_responses")
@Getter
@Setter
public class EventResponse {
    @Id
    private String id = UUID.randomUUID().toString();

    @Column(nullable = false)
    private String eventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventRsvp response;

}
