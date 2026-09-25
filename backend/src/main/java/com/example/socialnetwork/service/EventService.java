package com.example.socialnetwork.service;

import com.example.socialnetwork.dto.event.CreateEventRequest;
import com.example.socialnetwork.dto.event.EventResponseDto;
import com.example.socialnetwork.dto.event.EventRsvpRequest;
import com.example.socialnetwork.entity.Event;
import com.example.socialnetwork.entity.EventResponse;
import com.example.socialnetwork.entity.EventRsvp;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.EventRepository;
import com.example.socialnetwork.repository.EventResponseRepository;
import com.example.socialnetwork.repository.GroupMemberRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class EventService {

    private final EventRepository eventRepository;
    private final EventResponseRepository eventResponseRepository;
    private final GroupService groupService;
    private final GroupMemberRepository groupMemberRepository;
    private final NotificationService notificationService;

    public EventService(EventRepository eventRepository,
            EventResponseRepository eventResponseRepository,
            GroupService groupService,
            GroupMemberRepository groupMemberRepository,
            NotificationService notificationService) {
        this.eventRepository = eventRepository;
        this.eventResponseRepository = eventResponseRepository;
        this.groupService = groupService;
        this.groupMemberRepository = groupMemberRepository;
        this.notificationService = notificationService;
    }

    // Crée un event dans un groupe. Réservé aux membres du groupe.
    public EventResponseDto createEvent(String groupId, User currentUser, CreateEventRequest req) {

        if (!groupService.isAcceptedMember(groupId, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu n'es pas membre de ce groupe");
        }

        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le titre de l'event est obligatoire");
        }

        if (req.getEventTime() == null || req.getEventTime().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date/heure de l'event est obligatoire");
        }

        Event event = new Event();
        event.setGroupId(groupId);
        event.setCreator(currentUser);
        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setEventTime(req.getEventTime());
        event = eventRepository.save(event);
        String eventId = event.getId();

        groupMemberRepository.findByGroupIdAndStatus(
                groupId,
                com.example.socialnetwork.entity.GroupMemberStatus.ACCEPTED)
            .forEach(member -> notificationService.createNotification(
                member.getUser().getId(), "event_created", eventId));

        return toResponse(event, currentUser.getId());
    }

    // Liste les events d'un groupe. Réservé aux membres.
    @Transactional(readOnly = true)
    public List<EventResponseDto> listEvents(String groupId, User currentUser) {

        if (!groupService.isAcceptedMember(groupId, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu n'es pas membre de ce groupe");
        }

        return eventRepository.findByGroupIdOrderByEventTimeAsc(groupId).stream()
                .map(event -> toResponse(event, currentUser.getId()))
                .toList();
    }

    // Répond à un event (GOING / NOT_GOING). La réponse est modifiable (upsert).
    public EventResponseDto respondToEvent(String eventId, User currentUser, EventRsvpRequest req) {

        if (req.getResponse() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La réponse est obligatoire");
        }

        Event event = findEventOrThrow(eventId);

        if (!groupService.isAcceptedMember(event.getGroupId(), currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu n'es pas membre de ce groupe");
        }

        EventResponse eventResponse = eventResponseRepository
                .findByEventIdAndUserId(eventId, currentUser.getId())
                .orElseGet(() -> {
                    EventResponse created = new EventResponse();
                    created.setEventId(eventId);
                    created.setUser(currentUser);
                    return created;
                });

        eventResponse.setResponse(req.getResponse());
        eventResponseRepository.save(eventResponse);

        return toResponse(event, currentUser.getId());
    }

    // ---------- Méthodes privées ----------

    private Event findEventOrThrow(String eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event introuvable"));
    }

    private EventResponseDto toResponse(Event event, String currentUserId) {
        EventResponseDto response = new EventResponseDto();
        response.setId(event.getId());
        response.setGroupId(event.getGroupId());
        response.setTitle(event.getTitle());
        response.setDescription(event.getDescription());
        response.setEventTime(event.getEventTime());
        response.setCreatorId(event.getCreator().getId());
        response.setGoingCount(eventResponseRepository.countByEventIdAndResponse(event.getId(), EventRsvp.GOING));
        response.setNotGoingCount(eventResponseRepository.countByEventIdAndResponse(event.getId(), EventRsvp.NOT_GOING));
        response.setMyResponse(eventResponseRepository.findByEventIdAndUserId(event.getId(), currentUserId)
                .map(rsvp -> rsvp.getResponse().name())
                .orElse(null));
        response.setCreatedAt(event.getCreatedAt());
        return response;
    }
}
