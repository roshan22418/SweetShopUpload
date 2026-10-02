package com.sweetshop.backend.user;

import com.sweetshop.backend.user.dto.ChangePasswordRequest;
import com.sweetshop.backend.user.dto.UpdateProfileRequest;
import com.sweetshop.backend.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public UserResponse getMe(@AuthenticationPrincipal UserPrincipal principal) {
        return userService.getMe(principal.getId());
    }

    @PutMapping
    public UserResponse updateMe(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateMe(principal.getId(), request);
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(principal.getId(), request);
        return ResponseEntity.noContent().build();
    }
}
