package com.sweetshop.backend.order.dto;

import com.sweetshop.backend.order.FulfillmentType;
import com.sweetshop.backend.order.Order;
import com.sweetshop.backend.order.OrderStatus;
import com.sweetshop.backend.order.PaymentMethod;
import com.sweetshop.backend.order.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class OrderResponse {
    private Long id;
    private OrderStatus status;
    private FulfillmentType fulfillmentType;
    private String contactPhone;
    private String deliveryAddress;
    private List<OrderItemResponse> items;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;

    public static OrderResponse from(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(OrderItemResponse::from)
                .toList();

        return new OrderResponse(
                order.getId(),
                order.getStatus(),
                order.getFulfillmentType(),
                order.getContactPhone(),
                order.getDeliveryAddress(),
                items,
                order.getTotalAmount(),
                order.getCreatedAt(),
                order.getUser().getId(),
                order.getUser().getFullName(),
                order.getUser().getEmail(),
                order.getPaymentMethod(),
                order.getPaymentStatus()
        );
    }
}
