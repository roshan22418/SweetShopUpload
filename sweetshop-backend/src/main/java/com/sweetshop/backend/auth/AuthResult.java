package com.sweetshop.backend.auth;

import com.sweetshop.backend.auth.dto.AuthResponse;

/** What AuthService hands the controller: the JSON body plus the raw refresh token for the cookie. */
public record AuthResult(AuthResponse response, String refreshToken) {}
