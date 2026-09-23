package com.example.socialnetwork.service;

import com.example.socialnetwork.dto.group.CreateGroupRequest;
import com.example.socialnetwork.dto.group.GroupMemberResponse;
import com.example.socialnetwork.dto.group.GroupResponse;
import com.example.socialnetwork.entity.Group;
import com.example.socialnetwork.entity.GroupMember;
import com.example.socialnetwork.entity.GroupMemberStatus;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.GroupMemberRepository;
import com.example.socialnetwork.repository.GroupRepository;
import com.example.socialnetwork.repository.PostRepository;
import com.example.socialnetwork.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final NotificationService notificationService;

    public GroupService(GroupRepository groupRepository,
            GroupMemberRepository groupMemberRepository,
            UserRepository userRepository,
            PostRepository postRepository,
            NotificationService notificationService) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.notificationService = notificationService;
    }

    // Crée un groupe. Le créateur devient automatiquement membre ACCEPTED.
    public GroupResponse createGroup(User currentUser, CreateGroupRequest req) {

        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le titre du groupe est obligatoire");
        }

        Group group = new Group();
        group.setCreator(currentUser);
        group.setTitle(req.getTitle());
        group.setDescription(req.getDescription());
        group = groupRepository.save(group);

        addMember(group.getId(), currentUser, GroupMemberStatus.ACCEPTED);

        return toGroupResponse(group, currentUser.getId());
    }

    // Parcourt tous les groupes (la section "browse").
    @Transactional(readOnly = true)
    public List<GroupResponse> listAllGroups(User currentUser) {
        return groupRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(group -> toGroupResponse(group, currentUser.getId()))
                .toList();
    }

    // Détail (résumé) d'un groupe : accessible à tout utilisateur connecté.
    // Les posts, commentaires, membres et events restent réservés aux membres.
    @Transactional(readOnly = true)
    public GroupResponse getGroupDetail(String groupId, User currentUser) {
        Group group = findGroupOrThrow(groupId);
        return toGroupResponse(group, currentUser.getId());
    }

    // Liste des vrais membres d'un groupe.
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> listMembers(String groupId, User currentUser) {
        findGroupOrThrow(groupId);
        requireAcceptedMember(groupId, currentUser.getId());
        return groupMemberRepository.findByGroupIdAndStatus(groupId, GroupMemberStatus.ACCEPTED).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    // Mes groupes (où je suis ACCEPTED).
    @Transactional(readOnly = true)
    public List<GroupResponse> listMyGroups(User currentUser) {
        return listGroupsByMemberStatus(currentUser.getId(), GroupMemberStatus.ACCEPTED, currentUser.getId());
    }

    // Les invitations que j'ai reçues et pas encore traitées.
    @Transactional(readOnly = true)
    public List<GroupResponse> listMyInvitations(User currentUser) {
        return listGroupsByMemberStatus(currentUser.getId(), GroupMemberStatus.INVITED, currentUser.getId());
    }

    // Demandes d'adhésion en attente : réservé au créateur.
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> listPendingRequests(String groupId, User currentUser) {
        Group group = findGroupOrThrow(groupId);
        requireCreator(group, currentUser);
        return groupMemberRepository.findByGroupIdAndStatus(groupId, GroupMemberStatus.REQUESTED).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    // Un membre ACCEPTED invite un utilisateur (statut INVITED).
    public GroupMemberResponse inviteUser(String groupId, String targetUserId, User currentUser) {
        findGroupOrThrow(groupId);
        requireAcceptedMember(groupId, currentUser.getId());
        User target = findUserOrThrow(targetUserId);

        if (groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cet utilisateur a déjà une relation avec le groupe");
        }

        GroupMember member = addMember(groupId, target, GroupMemberStatus.INVITED);
        notificationService.createNotification(target.getId(), "group_invite", groupId);
        return toMemberResponse(member);
    }

    // Un utilisateur demande à rejoindre un groupe (statut REQUESTED).
    public GroupMemberResponse requestToJoin(String groupId, User currentUser) {
        Group group = findGroupOrThrow(groupId);

        if (group.getCreator().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tu es déjà membre de ce groupe");
        }

        if (groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tu as déjà une relation avec ce groupe");
        }

        GroupMember member = addMember(groupId, currentUser, GroupMemberStatus.REQUESTED);
        notificationService.createNotification(group.getCreator().getId(), "group_join_request", groupId);
        return toMemberResponse(member);
    }

    // L'invité accepte ou refuse sa propre invitation.
    public GroupResponse respondToInvitation(String groupId, boolean accept, User currentUser) {
        Group group = findGroupOrThrow(groupId);

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucune invitation trouvée"));

        if (member.getStatus() != GroupMemberStatus.INVITED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucune invitation en attente");
        }

        if (accept) {
            member.setStatus(GroupMemberStatus.ACCEPTED);
            groupMemberRepository.save(member);
        } else {
            groupMemberRepository.delete(member);
        }

        return toGroupResponse(group, currentUser.getId());
    }

    // Le créateur accepte ou refuse une demande d'adhésion.
    public GroupResponse respondToJoinRequest(String groupId, String targetUserId, boolean accept, User currentUser) {
        Group group = findGroupOrThrow(groupId);
        requireCreator(group, currentUser);

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucune demande trouvée"));

        if (member.getStatus() != GroupMemberStatus.REQUESTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Aucune demande en attente pour cet utilisateur");
        }

        if (accept) {
            member.setStatus(GroupMemberStatus.ACCEPTED);
            groupMemberRepository.save(member);
        } else {
            groupMemberRepository.delete(member);
        }

        return toGroupResponse(group, currentUser.getId());
    }

    // Le créateur supprime le groupe et tout son contenu.
    public void deleteGroup(String groupId, User currentUser) {
        Group group = findGroupOrThrow(groupId);
        requireCreator(group, currentUser);

        // Les posts de groupe n'ont pas de FK vers groups, on les supprime explicitement.
        // Les commentaires et likes partent en cascade (ON DELETE CASCADE).
        postRepository.deleteByGroupId(groupId);

        // group_members, events (et event_responses) partent en cascade.
        groupRepository.delete(group);
    }

    // Un membre (non-créateur) quitte le groupe.
    public void leaveGroup(String groupId, User currentUser) {
        Group group = findGroupOrThrow(groupId);

        if (group.getCreator().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le créateur ne peut pas quitter son propre groupe");
        }

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tu n'es pas membre de ce groupe"));

        if (member.getStatus() != GroupMemberStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tu n'es pas membre de ce groupe");
        }

        groupMemberRepository.delete(member);
    }

    // Vérifie si un utilisateur est membre ACCEPTED d'un groupe.
    public boolean isAcceptedMember(String groupId, String userId) {
        return groupMemberRepository.existsByGroupIdAndUserIdAndStatus(
                groupId, userId, GroupMemberStatus.ACCEPTED);
    }

    // ---------- Méthodes privées ----------

    private GroupMember addMember(String groupId, User user, GroupMemberStatus status) {
        GroupMember member = new GroupMember();
        member.setGroupId(groupId);
        member.setUser(user);
        member.setStatus(status);
        return groupMemberRepository.save(member);
    }

    private List<GroupResponse> listGroupsByMemberStatus(String userId, GroupMemberStatus status, String viewerId) {
        return groupMemberRepository.findByUserIdAndStatus(userId, status).stream()
                .map(member -> groupRepository.findById(member.getGroupId()).orElse(null))
                .filter(Objects::nonNull)
                .map(group -> toGroupResponse(group, viewerId))
                .toList();
    }

    private Group findGroupOrThrow(String groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Groupe introuvable"));
    }

    private User findUserOrThrow(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    }

    private void requireAcceptedMember(String groupId, String userId) {
        if (!isAcceptedMember(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu n'es pas membre de ce groupe");
        }
    }

    private void requireCreator(Group group, User currentUser) {
        if (!group.getCreator().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le créateur peut effectuer cette action");
        }
    }

    private GroupResponse toGroupResponse(Group group, String currentUserId) {
        GroupResponse response = new GroupResponse();
        response.setId(group.getId());
        response.setTitle(group.getTitle());
        response.setDescription(group.getDescription());
        response.setCreatorId(group.getCreator().getId());
        response.setCreatorName(buildName(group.getCreator()));
        response.setMemberCount(groupMemberRepository.countByGroupIdAndStatus(group.getId(), GroupMemberStatus.ACCEPTED));
        response.setMyStatus(groupMemberRepository.findByGroupIdAndUserId(group.getId(), currentUserId)
                .map(member -> member.getStatus().name())
                .orElse(null));
        response.setCreatedAt(group.getCreatedAt());
        return response;
    }

    private GroupMemberResponse toMemberResponse(GroupMember member) {
        User user = member.getUser();
        GroupMemberResponse response = new GroupMemberResponse();
        response.setUserId(user.getId());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setStatus(member.getStatus());
        return response;
    }

    private String buildName(User user) {
        String firstName = user.getFirstName() == null ? "" : user.getFirstName();
        String lastName = user.getLastName() == null ? "" : user.getLastName();
        return (firstName + " " + lastName).trim();
    }
}
