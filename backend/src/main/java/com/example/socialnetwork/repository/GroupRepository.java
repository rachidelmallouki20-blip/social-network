package com.example.socialnetwork.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.socialnetwork.entity.Group;

import java.util.List;

public interface GroupRepository extends JpaRepository<Group, String>{
    
    List<Group> findAllByOrderByCreatedAtDesc();

    List<Group> findByTitleContainingIgnoreCase(String title);


}

