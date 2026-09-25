package com.example.socialnetwork.service;

import com.example.socialnetwork.dto.NotificationResponse;
import com.example.socialnetwork.entity.Event;
import com.example.socialnetwork.entity.Follow;
import com.example.socialnetwork.entity.Group;
import com.example.socialnetwork.entity.Notification;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.EventRepository;
import com.example.socialnetwork.repository.FollowRepository;
import com.example.socialnetwork.repository.GroupRepository;
import com.example.socialnetwork.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final FollowRepository followRepository;
    private final GroupRepository groupRepository;
    private final EventRepository eventRepository;

    public void createFollowRequestNotification(String userId, String followId) {
        createNotification(userId, "follow_request", followId);
    }

    public void createNotification(String userId, String type, String referenceId) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String userId) {
        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public void markAsRead(String userId, String notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not allowed");
        }

        notification.setRead(true);
    }

    public void markAllAsRead(String userId) {
        notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .forEach(notification -> notification.setRead(true));
    }

    private NotificationResponse toResponse(Notification notification) {
        String type = notification.getType();
        String referenceId = notification.getReferenceId();
        String title = "Nouvelle notification";
        String details = "Vous avez une nouvelle notification.";
        String href = null;

        if (("follow_request".equals(type) || "new_follower".equals(type)) && referenceId != null) {
            Follow follow = followRepository.findById(referenceId).orElse(null);
            if (follow != null) {
                User follower = follow.getFollower();
                String name = fullName(follower);
                title = "follow_request".equals(type) ? "Demande d'abonnement" : "Nouveau follower";
                details = "follow_request".equals(type)
                        ? name + " souhaite vous suivre."
                        : name + " vous suit maintenant.";
                href = "/profile/" + follower.getId();
            }
        } else if (("group_invite".equals(type) || "group_join_request".equals(type)) && referenceId != null) {
            Group group = groupRepository.findById(referenceId).orElse(null);
            if (group != null) {
                title = "group_invite".equals(type) ? "Invitation à un groupe" : "Demande d'adhésion";
                details = "group_invite".equals(type)
                        ? "Vous êtes invité à rejoindre le groupe « " + group.getTitle() + " »."
                        : "Une demande d'adhésion attend votre réponse pour le groupe « " + group.getTitle() + " ».";
                href = "/groups/" + group.getId();
            }
        } else if ("event_created".equals(type) && referenceId != null) {
            Event event = eventRepository.findById(referenceId).orElse(null);
            if (event != null) {
                String groupName = groupRepository.findById(event.getGroupId())
                        .map(Group::getTitle)
                        .orElse("votre groupe");
                title = "Nouvel événement";
                details = "« " + event.getTitle() + " » a été créé dans le groupe « " + groupName + " ».";
                href = "/groups/" + event.getGroupId();
            }
        }

        return new NotificationResponse(
                notification.getId(),
                type,
                referenceId,
                notification.isRead(),
                notification.getCreatedAt(),
                title,
                details,
                href
        );
    }

    private String fullName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }
}
