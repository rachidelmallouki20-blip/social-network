package com.example.socialnetwork.service;

import com.example.socialnetwork.dto.chat.MessageResponse;
import com.example.socialnetwork.dto.chat.SendMessageRequest;
import com.example.socialnetwork.entity.Message;
import com.example.socialnetwork.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;

    public MessageResponse sendMessage(String senderId, SendMessageRequest request) {
        if (request.content() == null || request.content().isBlank()) {
            throw new IllegalArgumentException("Message cannot be empty");
        }

        Message message = new Message();
        message.setSenderId(senderId);
        message.setReceiverId(request.receiverId());
        message.setContent(request.content().trim());

        return MessageResponse.fromEntity(messageRepository.save(message));
    }

    public List<MessageResponse> getConversation(String userId, String otherUserId) {
        return messageRepository
                .findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderBySentAtAsc(
                        userId,
                        otherUserId,
                        otherUserId,
                        userId
                )
                .stream()
                .map(MessageResponse::fromEntity)
                .toList();
    }

    public long getUnreadCount(String userId) {
        return messageRepository.countByReceiverIdAndReadFalse(userId);
    }

    @Transactional
    public void markConversationAsRead(String userId, String otherUserId) {
        messageRepository.findByReceiverIdAndSenderIdAndReadFalse(userId, otherUserId)
                .forEach(message -> message.setRead(true));
    }
}
