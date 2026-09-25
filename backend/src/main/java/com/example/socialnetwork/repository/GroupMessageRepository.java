package com.example.socialnetwork.repository;

import com.example.socialnetwork.entity.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, String> {
    List<GroupMessage> findByGroupIdOrderBySentAtAsc(String groupId);
}
