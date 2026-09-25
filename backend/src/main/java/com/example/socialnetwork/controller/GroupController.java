package com.example.socialnetwork.controller;

import com.example.socialnetwork.dto.group.CreateGroupRequest;
import com.example.socialnetwork.dto.group.GroupMemberResponse;
import com.example.socialnetwork.dto.group.GroupResponse;
import com.example.socialnetwork.dto.group.InviteMemberRequest;
import com.example.socialnetwork.security.CurrentUserService;
import com.example.socialnetwork.service.GroupService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class GroupController {

    private final GroupService groupService;
    private final CurrentUserService currentUserService;

    public GroupController(GroupService groupService, CurrentUserService currentUserService) {
        this.groupService = groupService;
        this.currentUserService = currentUserService;
    }

    // ---------- Groupes ----------

    @PostMapping("/groups")
    public GroupResponse createGroup(@RequestBody CreateGroupRequest req) {
        return groupService.createGroup(currentUserService.getCurrentUser(), req);
    }

    @GetMapping("/groups")
    public List<GroupResponse> listAllGroups() {
        return groupService.listAllGroups(currentUserService.getCurrentUser());
    }

    @GetMapping("/groups/{groupId}")
    public GroupResponse getGroupDetail(@PathVariable String groupId) {
        return groupService.getGroupDetail(groupId, currentUserService.getCurrentUser());
    }

    @GetMapping("/groups/{groupId}/members")
    public List<GroupMemberResponse> listMembers(@PathVariable String groupId) {
        return groupService.listMembers(groupId, currentUserService.getCurrentUser());
    }

    // ---------- Invitations ----------

    @PostMapping("/groups/{groupId}/invite")
    public GroupMemberResponse inviteUser(
            @PathVariable String groupId,
            @RequestBody InviteMemberRequest req
    ) {
        return groupService.inviteUser(groupId, req.getUserId(), currentUserService.getCurrentUser());
    }

    @PostMapping("/groups/{groupId}/invitation/accept")
    public GroupResponse acceptInvitation(@PathVariable String groupId) {
        return groupService.respondToInvitation(groupId, true, currentUserService.getCurrentUser());
    }

    @PostMapping("/groups/{groupId}/invitation/refuse")
    public GroupResponse refuseInvitation(@PathVariable String groupId) {
        return groupService.respondToInvitation(groupId, false, currentUserService.getCurrentUser());
    }

    // ---------- Demandes d'adhésion ----------

    @PostMapping("/groups/{groupId}/join-request")
    public GroupMemberResponse requestToJoin(@PathVariable String groupId) {
        return groupService.requestToJoin(groupId, currentUserService.getCurrentUser());
    }

    @GetMapping("/groups/{groupId}/requests")
    public List<GroupMemberResponse> listPendingRequests(@PathVariable String groupId) {
        return groupService.listPendingRequests(groupId, currentUserService.getCurrentUser());
    }

    @PostMapping("/groups/{groupId}/requests/{userId}/accept")
    public GroupResponse acceptJoinRequest(
            @PathVariable String groupId,
            @PathVariable String userId
    ) {
        return groupService.respondToJoinRequest(groupId, userId, true, currentUserService.getCurrentUser());
    }

    @PostMapping("/groups/{groupId}/requests/{userId}/refuse")
    public GroupResponse refuseJoinRequest(
            @PathVariable String groupId,
            @PathVariable String userId
    ) {
        return groupService.respondToJoinRequest(groupId, userId, false, currentUserService.getCurrentUser());
    }

    @PostMapping("/groups/{groupId}/leave")
    public void leaveGroup(@PathVariable String groupId) {
        groupService.leaveGroup(groupId, currentUserService.getCurrentUser());
    }

    @DeleteMapping("/groups/{groupId}")
    public void deleteGroup(@PathVariable String groupId) {
        groupService.deleteGroup(groupId, currentUserService.getCurrentUser());
    }

    // ---------- Mes groupes / invitations ----------

    @GetMapping("/users/me/groups")
    public List<GroupResponse> listMyGroups() {
        return groupService.listMyGroups(currentUserService.getCurrentUser());
    }

    @GetMapping("/users/me/group-invitations")
    public List<GroupResponse> listMyInvitations() {
        return groupService.listMyInvitations(currentUserService.getCurrentUser());
    }
}
