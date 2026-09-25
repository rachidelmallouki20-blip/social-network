package com.example.socialnetwork.entity;

import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import jakarta.persistence.*;

@Entity
@Table(name = "group_members")
@Getter
@Setter

public class GroupMember {

    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String groupId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GroupMemberStatus status;

    @Column(name = "created_at", updatable = false, nullable = false)
    private String createdAt = Instant.now().toString();
}
