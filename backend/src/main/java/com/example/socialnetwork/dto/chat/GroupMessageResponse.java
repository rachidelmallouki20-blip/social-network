package com.example.socialnetwork.dto.chat;

import com.example.socialnetwork.entity.GroupMessage;

public record GroupMessageResponse(
        String id,
        String groupId,
        String senderId,
        String senderFirstName,
        String senderLastName,
        String senderAvatarUrl,
        String content,
        String sentAt
) {
    public static GroupMessageResponse fromEntity(GroupMessage message) {
        return new GroupMessageResponse(
                message.getId(),
                message.getGroupId(),
                message.getSender().getId(),
                message.getSender().getFirstName(),
                message.getSender().getLastName(),
                message.getSender().getAvatarUrl(),
                message.getContent(),
                message.getSentAt()
        );
    }
}
