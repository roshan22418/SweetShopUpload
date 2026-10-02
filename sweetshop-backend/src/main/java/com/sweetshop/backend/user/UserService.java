package com.sweetshop.backend.user;

import com.sweetshop.backend.user.dto.ChangePasswordRequest;
import com.sweetshop.backend.user.dto.UpdateProfileRequest;
import com.sweetshop.backend.user.dto.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse getMe(Long userId) {
        return UserResponse.from(findById(userId));
    }

    public UserResponse updateMe(Long userId, UpdateProfileRequest request) {
        User user = findById(userId);
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhoneNumber());
        return UserResponse.from(userRepository.save(user));
    }

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = findById(userId);

        if (!user.isPasswordSet()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This account signs in with Google and has no password to change");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private User findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
