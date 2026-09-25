package com.example.socialnetwork.dto;

import com.example.socialnetwork.entity.Notification;

public record NotificationResponse(
        String id,
        String type,
        String referenceId,
        boolean read,
        String createdAt,
        String title,
        String details,
        String href
) {
    public static NotificationResponse fromEntity(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getReferenceId(),
                notification.isRead(),
                notification.getCreatedAt(),
                "Notification",
                "Vous avez une nouvelle notification.",
                null
        );
    }
}
