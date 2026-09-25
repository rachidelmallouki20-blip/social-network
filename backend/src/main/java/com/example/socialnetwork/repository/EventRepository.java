package com.example.socialnetwork.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.socialnetwork.entity.Event;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, String>{
    
    List<Event> findByGroupIdOrderByEventTimeAsc(String groupId);
}
