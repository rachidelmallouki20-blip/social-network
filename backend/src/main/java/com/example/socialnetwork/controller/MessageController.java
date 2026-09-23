package com.example.socialnetwork.controller;

import com.example.socialnetwork.dto.chat.MessageResponse;
import com.example.socialnetwork.security.CurrentUserService;
import com.example.socialnetwork.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final CurrentUserService currentUserService;

    @GetMapping("/{userId}")
    public List<MessageResponse> getConversation(@PathVariable String userId) {
        String currentUserId = currentUserService.getCurrentUser().getId();
        return messageService.getConversation(currentUserId, userId);
    }

    @GetMapping("/unread-count")
    public java.util.Map<String, Long> getUnreadCount() {
        String currentUserId = currentUserService.getCurrentUser().getId();
        return java.util.Map.of("count", messageService.getUnreadCount(currentUserId));
    }

    @PostMapping("/{userId}/read")
    public java.util.Map<String, String> markConversationAsRead(@PathVariable String userId) {
        String currentUserId = currentUserService.getCurrentUser().getId();
        messageService.markConversationAsRead(currentUserId, userId);
        return java.util.Map.of("message", "Conversation marked as read");
    }
}