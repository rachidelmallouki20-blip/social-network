package com.example.socialnetwork.service;

import com.example.socialnetwork.dto.profile.FollowResponse;
import com.example.socialnetwork.dto.profile.ProfileResponse;
import com.example.socialnetwork.dto.profile.UpdateProfileRequest;
import com.example.socialnetwork.entity.Follow;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.FollowRepository;
import com.example.socialnetwork.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.example.socialnetwork.repository.NotificationRepository;
import com.example.socialnetwork.service.NotificationService;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProfileService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final NotificationService notificationService;

    public ProfileService(
        UserRepository userRepository,
        FollowRepository followRepository,
        NotificationService notificationService
        ) {
            this.userRepository = userRepository;
            this.followRepository = followRepository;
            this.notificationService = notificationService;
        }

    /**
     * Récupère le profil complet d'un utilisateur selon les règles de confidentialité.
     */
    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String targetUserId, User currentUser) {
        User targetUser = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        long followersCount = followRepository.countByFolloweeIdAndStatus(targetUserId, "accepted");
        long followingCount = followRepository.countByFollowerIdAndStatus(targetUserId, "accepted");

        String followStatus = "NONE";
        boolean canViewContent;

        if (currentUser == null) {
            canViewContent = targetUser.isPublic();
        } else if (currentUser.getId().equals(targetUserId)) {
            followStatus = "SELF";
            canViewContent = true;
        } else {
            Optional<Follow> followOpt = followRepository.findByFollowerIdAndFolloweeId(currentUser.getId(), targetUserId);
            if (followOpt.isPresent()) {
                followStatus = followOpt.get().getStatus().toUpperCase(); // "PENDING" ou "ACCEPTED"
            }
            canViewContent = targetUser.isPublic() || "ACCEPTED".equalsIgnoreCase(followStatus);
        }

        return new ProfileResponse(
            targetUser.getId(),
            canViewContent ? targetUser.getEmail() : null,
            targetUser.getFirstName(),
            targetUser.getLastName(),
            canViewContent ? targetUser.getDateOfBirth() : null,
            targetUser.getAvatarUrl(),
            targetUser.getNickname(),
            targetUser.getAboutMe(),
            targetUser.isPublic(),
            targetUser.getCreatedAt(),
            followersCount,
            followingCount,
            followStatus,
            canViewContent
        );
    }

    /**
     * Met à jour les informations du profil et le statut Public / Privé.
     */
    public ProfileResponse updateProfile(User currentUser, UpdateProfileRequest req) {
        System.out.println("request body: ->>>>> " + req);
        if (req.firstName() != null && !req.firstName().isBlank()) {
            currentUser.setFirstName(req.firstName().trim());
        }
        if (req.lastName() != null && !req.lastName().isBlank()) {
            currentUser.setLastName(req.lastName().trim());
        }
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBlank()) {
            currentUser.setDateOfBirth(req.dateOfBirth().trim());
        }
        if (req.avatarUrl() != null) {
            currentUser.setAvatarUrl(req.avatarUrl().trim());
        }
        if (req.nickname() != null) {
            currentUser.setNickname(req.nickname().trim().isEmpty() ? null : req.nickname().trim());
        }
        if (req.aboutMe() != null) {
            currentUser.setAboutMe(req.aboutMe().trim().isEmpty() ? null : req.aboutMe().trim());
        }
        if (req.isPublic() != null) {
            currentUser.setPublic(req.isPublic());
        }

        User saved = userRepository.save(currentUser);
        return getProfile(saved.getId(), saved);
    }

    /**
     * Follow ou Unfollow un utilisateur cible.
     */
    public FollowResponse toggleFollow(User currentUser, String targetUserId) {
        if (currentUser.getId().equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot follow yourself");
        }

        User targetUser = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Optional<Follow> existingFollow = followRepository.findByFollowerIdAndFolloweeId(currentUser.getId(), targetUserId);

        if (existingFollow.isPresent()) {
            // Si la relation existe (pending ou accepted), on unfollow / on annule
            followRepository.delete(existingFollow.get());
            return new FollowResponse(null, targetUserId, null, null, null, null, null, "NONE", null);
        } else {
            // Création d'une nouvelle relation de follow
            Follow follow = new Follow();
            follow.setFollower(currentUser);
            follow.setFollowee(targetUser);
            // Public -> accepted direct ; Privé -> pending
            follow.setStatus(targetUser.isPublic() ? "accepted" : "pending");

            Follow saved = followRepository.save(follow);

                notificationService.createNotification(
                    targetUser.getId(),
                    "pending".equals(saved.getStatus()) ? "follow_request" : "new_follower",
                    saved.getId()
                );

            return FollowResponse.fromFollowee(saved);
        }
    }

    /**
     * Récupère la liste des abonnés (followers) d'un utilisateur.
     */
    @Transactional(readOnly = true)
    public List<FollowResponse> getFollowers(String targetUserId, User currentUser) {
        verifyCanViewFollowLists(targetUserId, currentUser);
        return followRepository.findFollowersByFolloweeIdAndStatus(targetUserId, "accepted")
            .stream()
            .map(FollowResponse::fromFollower)
            .toList();
    }

    /**
     * Récupère la liste des personnes suivies (following) par un utilisateur.
     */
    @Transactional(readOnly = true)
    public List<FollowResponse> getFollowing(String targetUserId, User currentUser) {
        verifyCanViewFollowLists(targetUserId, currentUser);
        return followRepository.findFollowingByFollowerIdAndStatus(targetUserId, "accepted")
            .stream()
            .map(FollowResponse::fromFollowee)
            .toList();
    }

    /**
     * Récupère les demandes d'abonnements en attente reçues par l'utilisateur connecté.
     */
    @Transactional(readOnly = true)
    public List<FollowResponse> getPendingRequests(User currentUser) {
        return followRepository.findPendingRequestsForUser(currentUser.getId())
            .stream()
            .map(FollowResponse::fromFollower)
            .toList();
    }

    /**
     * Accepte ou refuse une demande d'abonnement reçue.
     */
    public void respondToFollowRequest(User currentUser, String followId, boolean accept) {
        Follow follow = followRepository.findById(followId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Follow request not found"));

        if (!follow.getFollowee().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to respond to this request");
        }

        if (accept) {
            follow.setStatus("accepted");
            followRepository.save(follow);
        } else {
            followRepository.delete(follow);
        }
    }

    /**
     * Vérifie si le visiteur a le droit de voir les listes d'abonnés/abonnements.
     */
    private void verifyCanViewFollowLists(String targetUserId, User currentUser) {
        User targetUser = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (targetUser.isPublic()) {
            return;
        }
        if (currentUser != null && (currentUser.getId().equals(targetUserId)
            || followRepository.existsByFollowerIdAndFolloweeIdAndStatus(currentUser.getId(), targetUserId, "accepted"))) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is private");
    }
}