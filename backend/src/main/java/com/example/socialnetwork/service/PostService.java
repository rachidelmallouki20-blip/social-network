package com.example.socialnetwork.service;

import com.example.socialnetwork.dto.CreatePostRequest;
import com.example.socialnetwork.dto.PostResponse;
import com.example.socialnetwork.dto.UpdatePostRequest;
import com.example.socialnetwork.entity.Post;
import com.example.socialnetwork.entity.PostAllowedViewer;
import com.example.socialnetwork.entity.PostPrivacy;
import com.example.socialnetwork.entity.User;
import com.example.socialnetwork.repository.CommentRepository;
import com.example.socialnetwork.repository.FollowRepository;
import com.example.socialnetwork.repository.LikeRepository;
import com.example.socialnetwork.repository.PostAllowedViewerRepository;
import com.example.socialnetwork.repository.PostRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@Transactional
public class PostService {

    private final PostRepository postRepository;
    private final FollowRepository followRepository;
    private final PostAllowedViewerRepository allowedViewerRepository;
    private final LikeRepository likeRepository;
    private final GroupService groupService;
    private final CommentRepository commentRepository;

    public PostService(PostRepository postRepository,
            FollowRepository followRepository,
            PostAllowedViewerRepository allowedViewerRepository,
            LikeRepository likeRepository,
            GroupService groupService,
            CommentRepository commentRepository) {
        this.postRepository = postRepository;
        this.followRepository = followRepository;
        this.allowedViewerRepository = allowedViewerRepository;
        this.likeRepository = likeRepository;
        this.groupService = groupService;
        this.commentRepository = commentRepository;
    }

    public List<PostResponse> getUserPosts(String userId, User currentUser) {

        List<Post> allPosts = postRepository.findByAuthorIdOrderByCreatedAtDesc(userId);
        List<PostResponse> visiblePosts = new ArrayList<>();

        for (Post post : allPosts) {
            if (post.getGroupId() != null) {
                continue; // les posts de groupe ne s'affichent pas dans le profil
            }
            if (canViewPost(post, currentUser)) {
                visiblePosts.add(toResponse(post, currentUser));
            }
        }

        return visiblePosts;
    }

    public boolean canViewPost(Post post, User currentUser) {

        // Un post de groupe n'est visible que par les membres acceptés du groupe
        if (post.getGroupId() != null) {
            return currentUser != null
                    && groupService.isAcceptedMember(post.getGroupId(), currentUser.getId());
        }

        String authorId = post.getAuthor().getId();

        if (currentUser != null && currentUser.getId().equals(authorId)) {
            return true;
        }

        if (currentUser == null) {
            return post.getPrivacy() == PostPrivacy.PUBLIC;
        }

        if (post.getPrivacy() == PostPrivacy.PUBLIC) {
            return true;
        }

        if (post.getPrivacy() == PostPrivacy.FOLLOWERS) {
            return followRepository.existsByFollowerIdAndFolloweeIdAndStatus(
                    currentUser.getId(), authorId, "accepted");
        }

        if (post.getPrivacy() == PostPrivacy.PRIVATE) {
            return allowedViewerRepository.existsByPostIdAndUserId(
                    post.getId(), currentUser.getId());
        }

        return false;
    }

    public PostResponse createPost(User currentUser, CreatePostRequest req) {

        Post post = new Post();
        post.setAuthor(currentUser);
        post.setContent(req.getContent());
        post.setImageUrl(req.getImageUrl());

        if (req.getPrivacy() != null) {
            post.setPrivacy(req.getPrivacy());
        } else {
            post.setPrivacy(PostPrivacy.PUBLIC);
        }

        post = postRepository.save(post);

        saveAllowedViewers(post, req.getPrivacy(), req.getAllowedViewerIds());

        Post savedPost = postRepository.findById(post.getId()).orElseThrow();
        return toResponse(savedPost, currentUser);
    }

    // Crée un post dans un groupe. Réservé aux membres acceptés du groupe.
    public PostResponse createGroupPost(String groupId, User currentUser, CreatePostRequest req) {

        if (!groupService.isAcceptedMember(groupId, currentUser.getId())) {
            throw new AccessDeniedException("Tu n'es pas membre de ce groupe");
        }

        Post post = new Post();
        post.setAuthor(currentUser);
        post.setGroupId(groupId);
        post.setContent(req.getContent());
        post.setImageUrl(req.getImageUrl());
        post.setPrivacy(PostPrivacy.PUBLIC);

        post = postRepository.save(post);

        return toResponse(post, currentUser);
    }

    // Liste les posts d'un groupe. Réservé aux membres acceptés du groupe.
    public List<PostResponse> getGroupPosts(String groupId, User currentUser) {

        if (!groupService.isAcceptedMember(groupId, currentUser.getId())) {
            throw new AccessDeniedException("Tu n'es pas membre de ce groupe");
        }

        List<PostResponse> result = new ArrayList<>();

        for (Post post : postRepository.findByGroupIdOrderByCreatedAtDesc(groupId)) {
            result.add(toResponse(post, currentUser));
        }

        return result;
    }

    // Modifie un post existant. Seul l'auteur du post a le droit de le faire.
    public PostResponse updatePost(String postId, User currentUser, UpdatePostRequest req) {

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NoSuchElementException("Post introuvable"));

        // Vérification importante : on ne laisse modifier que son propre post
        if (!post.getAuthor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Tu ne peux modifier que tes propres posts");
        }

        if (req.getContent() != null) {
            post.setContent(req.getContent());
        }

        if (req.getImageUrl() != null) {
            post.setImageUrl(req.getImageUrl());
        }

        if (req.getPrivacy() != null && req.getPrivacy() != PostPrivacy.PRIVATE) {
            allowedViewerRepository.deleteByPostId(post.getId());
        }

        if (req.getPrivacy() != null) {
            post.setPrivacy(req.getPrivacy());
        }

        post = postRepository.save(post);

        // Si le post est (ou devient) PRIVATE et que le client fournit une liste,
        // on remet à jour les viewers autorisés depuis zéro.
        // Si allowedViewerIds == null, on conserve la liste existante
        // (permet de modifier le texte sans effacer les autorisations).
        if (post.getPrivacy() == PostPrivacy.PRIVATE && req.getAllowedViewerIds() != null) {
            allowedViewerRepository.deleteByPostId(post.getId());
            saveAllowedViewers(post, req.getPrivacy(), req.getAllowedViewerIds());
        }

        return toResponse(post, currentUser);
    }

    // Supprime un post. Seul l'auteur du post a le droit de le faire.
    public void deletePost(String postId, User currentUser) {

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NoSuchElementException("Post introuvable"));

        if (!post.getAuthor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Tu ne peux supprimer que tes propres posts");
        }

        postRepository.delete(post);
        // Grâce à "ON DELETE CASCADE" dans la migration SQL,
        // les lignes liées dans post_allowed_viewers et comments
        // seront supprimées automatiquement par la base de données.
    }

    // Petite méthode utilitaire réutilisée par createPost et updatePost
    private void saveAllowedViewers(Post post, PostPrivacy privacy, List<String> allowedViewerIds) {

        if (privacy != PostPrivacy.PRIVATE || allowedViewerIds == null) {
            return;
        }

        for (String viewerId : allowedViewerIds) {
            PostAllowedViewer viewer = new PostAllowedViewer();
            viewer.setPostId(post.getId());
            viewer.setUserId(viewerId);
            allowedViewerRepository.save(viewer);
        }
    }

    private PostResponse toResponse(Post post, User currentUser) {
        PostResponse response = new PostResponse();
        response.setId(post.getId());
        response.setGroupId(post.getGroupId());
        response.setContent(post.getContent());
        response.setImageUrl(post.getImageUrl());
        response.setPrivacy(post.getPrivacy());
        if (post.getPrivacy() == PostPrivacy.PRIVATE) {
            response.setAllowedViewerIds(
                    allowedViewerRepository.findByPostId(post.getId()).stream()
                            .map(PostAllowedViewer::getUserId)
                            .toList());
        }
        response.setCreatedAt(post.getCreatedAt());
        response.setAuthorId(post.getAuthor().getId());
        response.setAuthorFirstName(post.getAuthor().getFirstName());
        response.setAuthorLastName(post.getAuthor().getLastName());
        response.setAuthorAvatarUrl(post.getAuthor().getAvatarUrl());
        response.setLikesCount(likeRepository.countByPostId(post.getId()));
        response.setLikedByMe(likeRepository.findByPostIdAndUserId(post.getId(), currentUser.getId()).isPresent());
        response.setCommentsCount(commentRepository.countByPostId(post.getId()));

        return response;
    }
}