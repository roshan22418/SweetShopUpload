package com.sweetshop.backend.cart;

import com.sweetshop.backend.cart.dto.AddCartItemRequest;
import com.sweetshop.backend.cart.dto.CartResponse;
import com.sweetshop.backend.cart.dto.UpdateCartItemRequest;
import com.sweetshop.backend.user.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartResponse getCart(@AuthenticationPrincipal UserPrincipal principal) {
        return cartService.getCart(principal.getId());
    }

    @PostMapping("/items")
    public CartResponse addItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AddCartItemRequest request) {
        return cartService.addItem(principal.getId(), request);
    }

    @PutMapping("/items/{productId}")
    public CartResponse updateItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long productId,
            @Valid @RequestBody UpdateCartItemRequest request) {
        return cartService.updateItem(principal.getId(), productId, request);
    }

    @DeleteMapping("/items/{productId}")
    public CartResponse removeItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long productId) {
        return cartService.removeItem(principal.getId(), productId);
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@AuthenticationPrincipal UserPrincipal principal) {
        cartService.clearCart(principal.getId());
        return ResponseEntity.noContent().build();
    }
}
