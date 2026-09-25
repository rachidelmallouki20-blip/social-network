package com.example.socialnetwork.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.socialnetwork.entity.GroupMember;
import com.example.socialnetwork.entity.GroupMemberStatus;

import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, String>{
    boolean existsByGroupIdAndUserIdAndStatus(String groupId, String userId, GroupMemberStatus status);
    List<GroupMember> findByUserIdAndStatus(String userId, GroupMemberStatus status); 
    List<GroupMember> findByGroupIdAndStatus(String groupId, GroupMemberStatus status);
    Optional<GroupMember> findByGroupIdAndUserId(String groupId, String userId);
    Long countByGroupIdAndStatus(String groupId, GroupMemberStatus status);
    void deleteByGroupIdAndUserId(String groupId, String userId);
}
