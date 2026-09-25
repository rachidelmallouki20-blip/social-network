package com.example.socialnetwork.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "events")
@Getter
@Setter
public class Event {
    @Id
    private String id = UUID.randomUUID().toString();

    @Column(nullable = false)
    private String groupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Column(nullable=false)
    private String title;

    private String description;

    @Column(nullable=false)
    private String eventTime;

    @Column(name = "created_at", updatable = false, nullable = false)
    private String createdAt = Instant.now().toString();

}
