package com.sweetshop.backend.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;

/**
 * Verifies a Google ID token (signature against Google's public keys, expiry, issuer, and that the
 * audience is OUR client id) and returns the trusted identity inside it.
 */
@Service
public class GoogleTokenVerifier {

    public record GoogleIdentity(String email, boolean emailVerified, String name) {}

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(@Value("${google.client-id}") String clientId) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(List.of(clientId))
                .build();
    }

    public GoogleIdentity verify(String idTokenString) {
        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(idTokenString);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            // IOException here = couldn't fetch Google's keys; either way we can't vouch for the token
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify Google sign-in");
        }
        if (idToken == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google sign-in");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        return new GoogleIdentity(
                payload.getEmail(),
                Boolean.TRUE.equals(payload.getEmailVerified()),
                (String) payload.get("name"));
    }
}
