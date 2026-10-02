package com.sweetshop.backend.auth;

import com.sweetshop.backend.auth.GoogleTokenVerifier.GoogleIdentity;
import com.sweetshop.backend.auth.dto.GoogleLoginRequest;
import com.sweetshop.backend.user.Role;
import com.sweetshop.backend.user.User;
import com.sweetshop.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceGoogleLoginTest {

    private UserRepository userRepository;
    private GoogleTokenVerifier googleVerifier;
    private RefreshTokenService refreshTokenService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        googleVerifier = mock(GoogleTokenVerifier.class);
        refreshTokenService = mock(RefreshTokenService.class);
        JwtService jwtService = new JwtService("test-secret-key-test-secret-key-test-secret-key-1234", 60_000);

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refreshTokenService.create(any(User.class))).thenReturn("raw-refresh-token");

        authService = new AuthService(userRepository, new BCryptPasswordEncoder(), jwtService,
                mock(AuthenticationManager.class), refreshTokenService, googleVerifier);
    }

    private GoogleLoginRequest request() {
        GoogleLoginRequest r = new GoogleLoginRequest();
        r.setIdToken("fake-id-token");
        return r;
    }

    @Test
    void newGoogleUserIsCreatedAsCustomerWithoutUsablePassword() {
        when(googleVerifier.verify("fake-id-token"))
                .thenReturn(new GoogleIdentity("new@gmail.com", true, "New Person"));
        when(userRepository.findByEmail("new@gmail.com")).thenReturn(Optional.empty());

        AuthResult result = authService.googleLogin(request());

        verify(userRepository).save(any(User.class));
        assertEquals("new@gmail.com", result.response().getEmail());
        assertEquals("New Person", result.response().getFullName());
        assertEquals(Role.CUSTOMER, result.response().getRole());
        assertNotNull(result.response().getToken());
        assertEquals("raw-refresh-token", result.refreshToken());
    }

    @Test
    void newGoogleUserIsMarkedPasswordNotSet() {
        when(googleVerifier.verify("fake-id-token"))
                .thenReturn(new GoogleIdentity("new@gmail.com", true, null));
        when(userRepository.findByEmail("new@gmail.com")).thenReturn(Optional.empty());

        AuthResult result = authService.googleLogin(request());

        // no name in the token -> falls back to the part before the @
        assertEquals("new", result.response().getFullName());
        org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertFalse(saved.getValue().isPasswordSet());
        assertNotNull(saved.getValue().getPasswordHash());
    }

    @Test
    void existingPasswordUserIsLinkedNotDuplicatedOrDowngraded() {
        User existing = User.builder().id(7L).fullName("Old Name").email("old@gmail.com")
                .passwordHash("hash").role(Role.ADMIN).build();
        when(googleVerifier.verify("fake-id-token"))
                .thenReturn(new GoogleIdentity("old@gmail.com", true, "Google Name"));
        when(userRepository.findByEmail("old@gmail.com")).thenReturn(Optional.of(existing));

        AuthResult result = authService.googleLogin(request());

        verify(userRepository, never()).save(any(User.class));
        assertEquals(7L, result.response().getUserId());
        assertEquals("Old Name", result.response().getFullName());
        assertEquals(Role.ADMIN, result.response().getRole());
        assertTrue(existing.isPasswordSet(), "linking must not remove the user's real password");
    }

    @Test
    void unverifiedGoogleEmailIsRejected() {
        when(googleVerifier.verify("fake-id-token"))
                .thenReturn(new GoogleIdentity("x@gmail.com", false, "X"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> authService.googleLogin(request()));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void invalidTokenPropagatesUnauthorized() {
        when(googleVerifier.verify("fake-id-token"))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google sign-in"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> authService.googleLogin(request()));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }
}
