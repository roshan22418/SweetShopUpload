package com.sweetshop.backend.cart.dto;

import com.sweetshop.backend.cart.CartItem;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class CartItemResponse {
    private Long productId;
    private String productName;
    private String unit;
    private BigDecimal price;
    private Integer quantity;
    private BigDecimal subtotal;
    private String imageUrl;

    public static CartItemResponse from(CartItem cartItem) {
        BigDecimal price = cartItem.getProduct().getPrice();
        BigDecimal subtotal = price.multiply(BigDecimal.valueOf(cartItem.getQuantity()));

        return new CartItemResponse(
                cartItem.getProduct().getId(),
                cartItem.getProduct().getName(),
                cartItem.getProduct().getUnit(),
                price,
                cartItem.getQuantity(),
                subtotal,
                cartItem.getProduct().getImageUrl()
        );
    }
}
