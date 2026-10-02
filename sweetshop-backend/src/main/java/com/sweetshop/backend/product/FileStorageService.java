package com.sweetshop.backend.product;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private static final Map<String, String> EXTENSION_BY_CONTENT_TYPE = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif");

    private final Path uploadRoot;
    private final CloudinaryUploader cloudinary;

    public FileStorageService(@Value("${app.upload.dir}") String uploadDir, CloudinaryUploader cloudinary) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.cloudinary = cloudinary;
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(uploadRoot);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create upload directory: " + uploadRoot, e);
        }
    }

    public Path getUploadRoot() {
        return uploadRoot;
    }

    /**
     * Saves the image and returns the URL to put in Product.imageUrl: a permanent Cloudinary https URL
     * when Cloudinary is configured, otherwise a backend-relative "/uploads/products/..." path.
     */
    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must not be empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Only JPEG, PNG, WEBP or GIF images are allowed");
        }

        String extension = EXTENSION_BY_CONTENT_TYPE.get(contentType);
        String filename = UUID.randomUUID() + extension;

        try {
            if (cloudinary.isConfigured()) {
                return cloudinary.upload(file.getBytes(), filename);
            }
            Files.copy(file.getInputStream(), uploadRoot.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded file", e);
        }

        return "/uploads/products/" + filename;
    }
}
