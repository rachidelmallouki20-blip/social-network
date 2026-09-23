package com.example.socialnetwork.controller;

import com.example.socialnetwork.dto.chat.GroupMessageResponse;
import com.example.socialnetwork.dto.chat.SendGroupMessageRequest;
import com.example.socialnetwork.security.CurrentUserService;
import com.example.socialnetwork.service.GroupMessageService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupMessageController {

    private final GroupMessageService groupMessageService;
    private final CurrentUserService currentUserService;
    private final SimpMessagingTemplate messagingTemplate;

    public GroupMessageController(
            GroupMessageService groupMessageService,
            CurrentUserService currentUserService,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.groupMessageService = groupMessageService;
        this.currentUserService = currentUserService;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/{groupId}/messages")
    public List<GroupMessageResponse> getMessages(@PathVariable String groupId) {
        return groupMessageService.getMessages(groupId, currentUserService.getCurrentUser());
    }

    @PostMapping("/{groupId}/messages")
    public GroupMessageResponse sendMessage(
            @PathVariable String groupId,
            @RequestBody SendGroupMessageRequest request
    ) {
        GroupMessageResponse message = groupMessageService.sendMessage(
                groupId,
                currentUserService.getCurrentUser(),
                request
        );
        messagingTemplate.convertAndSend("/topic/groups/" + groupId + "/messages", message);
        return message;
    }
}
