package com.sweetshop.backend.auth.dto;

import com.sweetshop.backend.user.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Long userId;
    private String fullName;
    private String email;
    private Role role;
}
