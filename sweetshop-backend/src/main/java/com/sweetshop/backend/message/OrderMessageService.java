package com.sweetshop.backend.message;

import com.sweetshop.backend.message.dto.OrderMessageRequest;
import com.sweetshop.backend.message.dto.OrderMessageResponse;
import com.sweetshop.backend.order.Order;
import com.sweetshop.backend.order.OrderRepository;
import com.sweetshop.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class OrderMessageService {

    private final OrderMessageRepository orderMessageRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public OrderMessageService(
            OrderMessageRepository orderMessageRepository,
            OrderRepository orderRepository,
            UserRepository userRepository) {
        this.orderMessageRepository = orderMessageRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    public List<OrderMessageResponse> getMessages(Long orderId, Long requesterId, boolean isAdmin) {
        Order order = findAccessibleOrder(orderId, requesterId, isAdmin);
        return orderMessageRepository.findByOrderIdOrderByCreatedAtAsc(order.getId()).stream()
                .map(OrderMessageResponse::from)
                .toList();
    }

    public OrderMessageResponse postMessage(Long orderId, Long senderId, boolean isAdmin, OrderMessageRequest request) {
        Order order = findAccessibleOrder(orderId, senderId, isAdmin);

        OrderMessage message = OrderMessage.builder()
                .order(order)
                .sender(userRepository.getReferenceById(senderId))
                .message(request.getMessage())
                .build();

        return OrderMessageResponse.from(orderMessageRepository.save(message));
    }

    // Same rule as OrderService.getOrderById: a non-admin can only touch their own order's
    // thread — 404, not 403, so a stranger can't even tell the order exists.
    private Order findAccessibleOrder(Long orderId, Long requesterId, boolean isAdmin) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!isAdmin && !order.getUser().getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
        }

        return order;
    }
}
