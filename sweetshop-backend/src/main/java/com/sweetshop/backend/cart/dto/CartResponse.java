package com.sweetshop.backend.cart.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@AllArgsConstructor
public class CartResponse {
    private List<CartItemResponse> items;
    private BigDecimal totalAmount;

    public static CartResponse from(List<CartItemResponse> items) {
        BigDecimal total = items.stream()
                .map(CartItemResponse::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(items, total);
    }
}
