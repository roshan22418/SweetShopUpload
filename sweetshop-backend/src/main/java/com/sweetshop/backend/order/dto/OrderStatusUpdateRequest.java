package com.sweetshop.backend.order.dto;

import com.sweetshop.backend.order.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private OrderStatus status;
}
