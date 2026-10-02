package com.sweetshop.backend.message;

import com.sweetshop.backend.message.dto.OrderMessageRequest;
import com.sweetshop.backend.message.dto.OrderMessageResponse;
import com.sweetshop.backend.user.Role;
import com.sweetshop.backend.user.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders/{orderId}/messages")
public class OrderMessageController {

    private final OrderMessageService orderMessageService;

    public OrderMessageController(OrderMessageService orderMessageService) {
        this.orderMessageService = orderMessageService;
    }

    @GetMapping
    public List<OrderMessageResponse> getMessages(
            @PathVariable Long orderId, @AuthenticationPrincipal UserPrincipal principal) {
        return orderMessageService.getMessages(orderId, principal.getId(), isAdmin(principal));
    }

    @PostMapping
    public ResponseEntity<OrderMessageResponse> postMessage(
            @PathVariable Long orderId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody OrderMessageRequest request) {
        OrderMessageResponse response =
                orderMessageService.postMessage(orderId, principal.getId(), isAdmin(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private boolean isAdmin(UserPrincipal principal) {
        return principal.getUser().getRole() == Role.ADMIN;
    }
}
