package com.sweetshop.backend.auth;

import com.sweetshop.backend.auth.dto.AuthResponse;
import com.sweetshop.backend.auth.dto.GoogleLoginRequest;
import com.sweetshop.backend.auth.dto.LoginRequest;
import com.sweetshop.backend.auth.dto.RegisterRequest;
import com.sweetshop.backend.user.Role;
import com.sweetshop.backend.user.User;
import com.sweetshop.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenService refreshTokenService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            RefreshTokenService refreshTokenService,
            GoogleTokenVerifier googleTokenVerifier) {
        this.googleTokenVerifier = googleTokenVerifier;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.refreshTokenService = refreshTokenService;
    }

    public AuthResult register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .role(Role.CUSTOMER)
                .build();

        userRepository.save(user);

        return issueTokens(user);
    }

    public AuthResult login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        return issueTokens(user);
    }

    /**
     * "Sign in with Google": the ID token is verified server-side, then we log in the matching user
     * or create one. An existing email/password account with the same email is linked automatically —
     * Google has verified the user owns that address, so it's the same person.
     */
    public AuthResult googleLogin(GoogleLoginRequest request) {
        GoogleTokenVerifier.GoogleIdentity identity = googleTokenVerifier.verify(request.getIdToken());

        if (identity.email() == null || !identity.emailVerified()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Your Google email is not verified");
        }

        User user = userRepository.findByEmail(identity.email()).orElseGet(() -> {
            String fullName = (identity.name() != null && !identity.name().isBlank())
                    ? identity.name()
                    : identity.email().substring(0, identity.email().indexOf('@'));
            return userRepository.save(User.builder()
                    .fullName(fullName)
                    .email(identity.email())
                    // random, never-revealed password: nobody can log in with it via the password form
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID() + UUID.randomUUID().toString()))
                    .passwordSet(false)
                    .role(Role.CUSTOMER)
                    .build());
        });

        return issueTokens(user);
    }

    public AuthResult refresh(String rawRefreshToken) {
        RefreshTokenService.Rotated rotated = refreshTokenService.rotate(rawRefreshToken);
        return toResult(rotated.user(), rotated.newRawToken());
    }

    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    private AuthResult issueTokens(User user) {
        return toResult(user, refreshTokenService.create(user));
    }

    private AuthResult toResult(User user, String refreshToken) {
        String accessToken = jwtService.generateToken(user.getEmail());
        AuthResponse response = new AuthResponse(
                accessToken, user.getId(), user.getFullName(), user.getEmail(), user.getRole());
        return new AuthResult(response, refreshToken);
    }
}
