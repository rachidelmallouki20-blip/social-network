package com.example.socialnetwork.service;

import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    // Dossier racine de toutes les images uploadées
    private static final String BASE_UPLOAD_DIR = "uploads";

    // Types d'images autorisés (Sécurité)
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    );

    private final Path rootLocation = Paths.get(BASE_UPLOAD_DIR);

    /**
     * Crée les sous-dossiers nécessaires au démarrage.
     */
    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation.resolve("avatars"));
            Files.createDirectories(rootLocation.resolve("posts"));
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory: " + BASE_UPLOAD_DIR, e);
        }
    }

    /**
     * Sauvegarde un avatar et retourne son URL relative publique.
     */
    public String storeAvatar(MultipartFile file) {
        return storeImage(file, "avatars");
    }

    /**
     * Sauvegarde une image de post et retourne son URL relative publique
     * (ex: /uploads/posts/uuid.png).
     */
    public String storePostImage(MultipartFile file) {
        return storeImage(file, "posts");
    }

    /**
     * Valide et sauvegarde un fichier image dans le sous-dossier demandé.
     * @return L'URL relative publique de l'image (ex: /uploads/posts/uuid.png)
     */
    public String storeImage(MultipartFile file, String subfolder) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty or missing");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG, WEBP, and GIF images are allowed");
        }

        // Récupération sécurisée de l'extension
        String originalFilename = file.getOriginalFilename();
        String extension = ".png"; // extension par défaut
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            // Nettoyage de l'extension
            if (!extension.matches("^\\.[a-z0-9]+$")) {
                extension = ".png";
            }
        }

        // Génération d'un nom unique pour éviter les collisions et écrasements
        String uniqueFilename = UUID.randomUUID().toString() + extension;

        Path targetDir = this.rootLocation.resolve(subfolder).normalize().toAbsolutePath();
        Path destinationFile = targetDir.resolve(Paths.get(uniqueFilename)).normalize().toAbsolutePath();

        // Protection contre le Path Traversal
        if (!destinationFile.getParent().equals(targetDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot store file outside upload directory");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.createDirectories(targetDir);
            Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image file", e);
        }

        // Retourne le chemin d'accès public
        return "/uploads/" + subfolder + "/" + uniqueFilename;
    }
}
