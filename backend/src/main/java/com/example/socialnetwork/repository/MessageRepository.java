package com.example.socialnetwork.repository;

import com.example.socialnetwork.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, String> {

    List<Message> findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderBySentAtAsc(
            String senderId,
            String receiverId,
            String receiverId2,
            String senderId2
    );

    long countByReceiverIdAndReadFalse(String receiverId);

    List<Message> findByReceiverIdAndSenderIdAndReadFalse(String receiverId, String senderId);
}