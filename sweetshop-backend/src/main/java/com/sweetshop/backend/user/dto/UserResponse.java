package com.sweetshop.backend.user.dto;

import com.sweetshop.backend.user.Role;
import com.sweetshop.backend.user.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phoneNumber;
    private Role role;
    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole(),
                user.getCreatedAt());
    }
}
