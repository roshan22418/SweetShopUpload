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
    private final LoginAttemptService loginAttempts;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            RefreshTokenService refreshTokenService,
            GoogleTokenVerifier googleTokenVerifier,
            LoginAttemptService loginAttempts) {
        this.googleTokenVerifier = googleTokenVerifier;
        this.loginAttempts = loginAttempts;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.refreshTokenService = refreshTokenService;
    }

    public AuthResult register(RegisterRequest request) {
        String email = UserRepository.normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .role(Role.CUSTOMER)
                .build();

        userRepository.save(user);

        return issueTokens(user);
    }

    public AuthResult login(LoginRequest request) {
        String email = UserRepository.normalizeEmail(request.getEmail());
        loginAttempts.checkAllowed(email);
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        } catch (BadCredentialsException e) {
            loginAttempts.recordFailure(email);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        loginAttempts.recordSuccess(email);

        User user = userRepository.findByLoginEmail(email)
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
        String email = UserRepository.normalizeEmail(identity.email());

        User user = userRepository.findByLoginEmail(email).orElseGet(() -> {
            String fullName = (identity.name() != null && !identity.name().isBlank())
                    ? identity.name()
                    : email.substring(0, email.indexOf('@'));
            return userRepository.save(User.builder()
                    .fullName(fullName.length() > 150 ? fullName.substring(0, 150) : fullName)
                    .email(email)
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
