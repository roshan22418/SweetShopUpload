package com.sweetshop.backend.message.dto;

import com.sweetshop.backend.message.OrderMessage;
import com.sweetshop.backend.user.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class OrderMessageResponse {
    private Long id;
    private Long orderId;
    private Long senderId;
    private String senderName;
    private Role senderRole;
    private String message;
    private LocalDateTime createdAt;

    public static OrderMessageResponse from(OrderMessage orderMessage) {
        return new OrderMessageResponse(
                orderMessage.getId(),
                orderMessage.getOrder().getId(),
                orderMessage.getSender().getId(),
                orderMessage.getSender().getFullName(),
                orderMessage.getSender().getRole(),
                orderMessage.getMessage(),
                orderMessage.getCreatedAt()
        );
    }
}
