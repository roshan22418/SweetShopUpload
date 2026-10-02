package com.sweetshop.backend.order.dto;

import com.sweetshop.backend.order.OrderItem;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class OrderItemResponse {
    private Long productId;
    private String productName;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotal;

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getProduct().getId(),
                item.getProductName(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getSubtotal()
        );
    }
}
