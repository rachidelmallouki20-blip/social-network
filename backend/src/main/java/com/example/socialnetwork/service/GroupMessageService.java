package com.example.socialnetwork.service;

import com.example.socialnetwork.dto.chat.GroupMessageResponse;
import com.example.socialnetwork.dto.chat.SendGroupMessageRequest;
import com.example.socialnetwork.entity.GroupMessage;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.GroupMessageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class GroupMessageService {

    private final GroupMessageRepository groupMessageRepository;
    private final GroupService groupService;

    public GroupMessageService(GroupMessageRepository groupMessageRepository, GroupService groupService) {
        this.groupMessageRepository = groupMessageRepository;
        this.groupService = groupService;
    }

    @Transactional(readOnly = true)
    public List<GroupMessageResponse> getMessages(String groupId, User currentUser) {
        requireAcceptedMember(groupId, currentUser);
        return groupMessageRepository.findByGroupIdOrderBySentAtAsc(groupId).stream()
                .map(GroupMessageResponse::fromEntity)
                .toList();
    }

    public GroupMessageResponse sendMessage(String groupId, User currentUser, SendGroupMessageRequest request) {
        requireAcceptedMember(groupId, currentUser);

        if (request == null || request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message cannot be empty");
        }

        GroupMessage message = new GroupMessage();
        message.setGroupId(groupId);
        message.setSender(currentUser);
        message.setContent(request.content().trim());

        return GroupMessageResponse.fromEntity(groupMessageRepository.save(message));
    }

    private void requireAcceptedMember(String groupId, User currentUser) {
        if (currentUser == null || !groupService.isAcceptedMember(groupId, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You must be an accepted group member");
        }
    }
}
