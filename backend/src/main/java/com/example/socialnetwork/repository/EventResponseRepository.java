package com.example.socialnetwork.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.socialnetwork.entity.EventResponse;
import com.example.socialnetwork.entity.EventRsvp;

import java.util.List;
import java.util.Optional;

public interface EventResponseRepository extends JpaRepository<EventResponse, String>{
    
    Long countByEventIdAndResponse(String eventId, EventRsvp response);

    Optional<EventResponse> findByEventIdAndUserId(String eventId, String userId);

    List<EventResponse> findByEventId(String eventId);

}
