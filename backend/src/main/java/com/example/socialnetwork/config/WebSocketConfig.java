package com.example.socialnetwork.config;

import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.UserRepository;
import com.example.socialnetwork.service.GroupService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.security.access.AccessDeniedException;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Pattern GROUP_CHAT_DESTINATION =
            Pattern.compile("^/topic/groups/([^/]+)/messages$");

    private final GroupService groupService;
    private final UserRepository userRepository;

    public WebSocketConfig(GroupService groupService, UserRepository userRepository) {
        this.groupService = groupService;
        this.userRepository = userRepository;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue", "/topic");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:3000")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (accessor.getCommand() != StompCommand.SUBSCRIBE) {
                    return message;
                }

                String destination = accessor.getDestination();
                Matcher matcher = destination == null ? null : GROUP_CHAT_DESTINATION.matcher(destination);
                if (matcher == null || !matcher.matches()) {
                    return message;
                }

                Principal principal = accessor.getUser();
                if (principal == null) {
                    throw new AccessDeniedException("Authentication is required for group chat");
                }

                User user = userRepository.findByEmail(principal.getName())
                        .orElseThrow(() -> new AccessDeniedException("Authenticated user was not found"));
                if (!groupService.isAcceptedMember(matcher.group(1), user.getId())) {
                    throw new AccessDeniedException("You must be an accepted group member");
                }

                return message;
            }
        });
    }
}
