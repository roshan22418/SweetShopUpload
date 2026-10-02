package com.sweetshop.backend.auth;

import com.sweetshop.backend.auth.dto.AuthResponse;
import com.sweetshop.backend.auth.dto.GoogleLoginRequest;
import com.sweetshop.backend.auth.dto.LoginRequest;
import com.sweetshop.backend.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";
    // Scoped to /api/auth so the browser only attaches it to refresh/logout, not every API call
    private static final String COOKIE_PATH = "/api/auth";

    private final AuthService authService;
    private final long refreshExpirationDays;
    private final boolean cookieSecure;
    private final String cookieSameSite;

    public AuthController(
            AuthService authService,
            @Value("${jwt.refresh-expiration-days}") long refreshExpirationDays,
            @Value("${app.cookie.secure}") boolean cookieSecure,
            @Value("${app.cookie.same-site}") String cookieSameSite) {
        this.authService = authService;
        this.refreshExpirationDays = refreshExpirationDays;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResult result = authService.register(request);
        return withRefreshCookie(ResponseEntity.status(HttpStatus.CREATED), result);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResult result = authService.login(request);
        return withRefreshCookie(ResponseEntity.ok(), result);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest request) {
        AuthResult result = authService.googleLogin(request);
        return withRefreshCookie(ResponseEntity.ok(), result);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No refresh token");
        }
        try {
            return withRefreshCookie(ResponseEntity.ok(), authService.refresh(refreshToken));
        } catch (ResponseStatusException e) {
            // Dead cookie: clear it so the browser stops sending it
            return ResponseEntity.status(e.getStatusCode())
                    .header(HttpHeaders.SET_COOKIE, buildCookie("", Duration.ZERO).toString())
                    .build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, buildCookie("", Duration.ZERO).toString())
                .build();
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(
            ResponseEntity.BodyBuilder builder, AuthResult result) {
        ResponseCookie cookie = buildCookie(result.refreshToken(), Duration.ofDays(refreshExpirationDays));
        return builder
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.response());
    }

    private ResponseCookie buildCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }
}
