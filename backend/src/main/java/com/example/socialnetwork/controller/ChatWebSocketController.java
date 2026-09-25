package com.example.socialnetwork.controller;

import com.example.socialnetwork.dto.chat.MessageResponse;
import com.example.socialnetwork.dto.chat.SendMessageRequest;
import com.example.socialnetwork.dto.chat.GroupMessageResponse;
import com.example.socialnetwork.dto.chat.SendGroupMessageRequest;
import com.example.socialnetwork.service.GroupMessageService;
import com.example.socialnetwork.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.UserRepository;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler; 
import java.util.Map;                                                              

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final MessageService messageService;
    private final GroupMessageService groupMessageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @MessageMapping("/chat.send")
    public void sendMessage(
        SendMessageRequest request,
        Principal principal
    ) {
        if (principal == null) {
            throw new IllegalStateException("WebSocket user is not authenticated");
        }

        User sender = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalStateException("Sender not found"));

        User receiver = userRepository.findById(request.receiverId())
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        MessageResponse message =
                messageService.sendMessage(sender.getId(), request);

        messagingTemplate.convertAndSendToUser(
                receiver.getEmail(),
                "/queue/messages",
                message
        );

        messagingTemplate.convertAndSendToUser(
                sender.getEmail(),
                "/queue/messages",
                message
        );
    }
    @MessageExceptionHandler
    public void handleException(Throwable exception, Principal principal) {
        if (principal == null) {
            return;
        }
        messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/errors",
                Map.of("error", exception.getMessage())
        );
    }

    @MessageMapping("/groups/{groupId}/chat.send")
    public void sendGroupMessage(
            @DestinationVariable String groupId,
            SendGroupMessageRequest request,
            Principal principal
    ) {
        User sender = getAuthenticatedUser(principal);
        GroupMessageResponse message = groupMessageService.sendMessage(groupId, sender, request);
        messagingTemplate.convertAndSend("/topic/groups/" + groupId + "/messages", message);
    }

    private User getAuthenticatedUser(Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("WebSocket user is not authenticated");
        }
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalStateException("Sender not found"));
    }
}
