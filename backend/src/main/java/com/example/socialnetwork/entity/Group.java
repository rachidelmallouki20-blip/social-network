package com.example.socialnetwork.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "groups")
@Getter
@Setter

public class Group {

    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "created_at", updatable = false, nullable = false)
    private String createdAt = Instant.now().toString();
}
