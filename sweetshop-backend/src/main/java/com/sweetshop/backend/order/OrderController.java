package com.sweetshop.backend.order;

import com.sweetshop.backend.order.dto.CheckoutRequest;
import com.sweetshop.backend.order.dto.OrderResponse;
import com.sweetshop.backend.order.dto.OrderStatusUpdateRequest;
import com.sweetshop.backend.user.Role;
import com.sweetshop.backend.user.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> checkout(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.checkout(principal.getId(), request));
    }

    @GetMapping
    public List<OrderResponse> getMyOrders(@AuthenticationPrincipal UserPrincipal principal) {
        return orderService.getMyOrders(principal.getId());
    }

    @GetMapping("/all")
    public List<OrderResponse> getAllOrders() {
        return orderService.getAllOrders();
    }

    @GetMapping("/{id}")
    public OrderResponse getOrderById(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        boolean isAdmin = principal.getUser().getRole() == Role.ADMIN;
        return orderService.getOrderById(id, principal.getId(), isAdmin);
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusUpdateRequest request) {
        return orderService.updateStatus(id, request.getStatus());
    }
}
