package com.sweetshop.backend.auth;

import com.sweetshop.backend.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    public record Rotated(User user, String newRawToken) {}

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository repository;
    private final long expirationDays;

    public RefreshTokenService(
            RefreshTokenRepository repository,
            @Value("${jwt.refresh-expiration-days}") long expirationDays) {
        this.repository = repository;
        this.expirationDays = expirationDays;
    }

    /** Creates and stores a new refresh token; returns the raw value to put in the cookie. */
    @Transactional
    public String create(User user) {
        repository.deleteExpired(LocalDateTime.now());

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        repository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hash(raw))
                .expiresAt(LocalDateTime.now().plusDays(expirationDays))
                .revoked(false)
                .build());
        return raw;
    }

    /**
     * Validates the presented token, revokes it, and issues its replacement (rotation).
     * Presenting an already-used token means it was probably stolen, so every session of that
     * user is wiped. noRollbackFor keeps that wipe from being undone when we then throw 401.
     */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public Rotated rotate(String rawToken) {
        RefreshToken token = repository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (token.isRevoked()) {
            repository.deleteAllByUserId(token.getUser().getId());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token reuse detected, please log in again");
        }

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired, please log in again");
        }

        token.setRevoked(true);
        User user = token.getUser();
        return new Rotated(user, create(user));
    }

    /** Logout: drops this token if it exists; unknown/missing tokens are silently fine. */
    @Transactional
    public void revoke(String rawToken) {
        repository.findByTokenHash(hash(rawToken)).ifPresent(repository::delete);
    }

    private static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
