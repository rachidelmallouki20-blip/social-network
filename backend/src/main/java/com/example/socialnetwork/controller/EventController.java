package com.example.socialnetwork.controller;

import com.example.socialnetwork.dto.event.CreateEventRequest;
import com.example.socialnetwork.dto.event.EventResponseDto;
import com.example.socialnetwork.dto.event.EventRsvpRequest;
import com.example.socialnetwork.security.CurrentUserService;
import com.example.socialnetwork.service.EventService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class EventController {

    private final EventService eventService;
    private final CurrentUserService currentUserService;

    public EventController(EventService eventService, CurrentUserService currentUserService) {
        this.eventService = eventService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/groups/{groupId}/events")
    public EventResponseDto createEvent(
            @PathVariable String groupId,
            @RequestBody CreateEventRequest req
    ) {
        return eventService.createEvent(groupId, currentUserService.getCurrentUser(), req);
    }

    @GetMapping("/groups/{groupId}/events")
    public List<EventResponseDto> listEvents(@PathVariable String groupId) {
        return eventService.listEvents(groupId, currentUserService.getCurrentUser());
    }

    @PostMapping("/events/{eventId}/responses")
    public EventResponseDto respondToEvent(
            @PathVariable String eventId,
            @RequestBody EventRsvpRequest req
    ) {
        return eventService.respondToEvent(eventId, currentUserService.getCurrentUser(), req);
    }
}
