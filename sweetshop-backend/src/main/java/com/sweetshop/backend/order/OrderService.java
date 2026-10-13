package com.sweetshop.backend.order;

import com.sweetshop.backend.cart.CartItem;
import com.sweetshop.backend.cart.CartItemRepository;
import com.sweetshop.backend.order.dto.CheckoutRequest;
import com.sweetshop.backend.order.dto.OrderResponse;
import com.sweetshop.backend.notification.OrderMessageFormatter;
import com.sweetshop.backend.notification.OrderPlacedEvent;
import com.sweetshop.backend.payment.PaymentService;
import com.sweetshop.backend.payment.RazorpayPayment;
import com.sweetshop.backend.product.Product;
import com.sweetshop.backend.product.ProductRepository;
import com.sweetshop.backend.user.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;
    private final ApplicationEventPublisher eventPublisher;

    public OrderService(
            OrderRepository orderRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            PaymentService paymentService,
            ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
        this.orderRepository = orderRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.paymentService = paymentService;
    }

    @Transactional
    public OrderResponse checkout(Long userId, CheckoutRequest request) {
        if (request.getFulfillmentType() == FulfillmentType.DELIVERY
                && !StringUtils.hasText(request.getDeliveryAddress())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery address is required for delivery orders");
        }

        PaymentMethod paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.COD;

        // Checked before touching stock or the cart; any later failure rolls the whole checkout back.
        RazorpayPayment payment = paymentMethod == PaymentMethod.RAZORPAY
                ? paymentService.claim(userId, request.getRazorpayOrderId(),
                        request.getRazorpayPaymentId(), request.getRazorpaySignature())
                : null;

        List<CartItem> cartItems = cartItemRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        Order order = Order.builder()
                .user(userRepository.getReferenceById(userId))
                .status(OrderStatus.PENDING)
                .fulfillmentType(request.getFulfillmentType())
                .contactPhone(request.getContactPhone())
                .deliveryAddress(request.getFulfillmentType() == FulfillmentType.DELIVERY
                        ? request.getDeliveryAddress() : null)
                .totalAmount(BigDecimal.ZERO)
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentMethod == PaymentMethod.RAZORPAY ? PaymentStatus.PAID : PaymentStatus.PENDING)
                .razorpayOrderId(paymentMethod == PaymentMethod.RAZORPAY ? request.getRazorpayOrderId() : null)
                .razorpayPaymentId(paymentMethod == PaymentMethod.RAZORPAY ? request.getRazorpayPaymentId() : null)
                .build();

        BigDecimal total = BigDecimal.ZERO;

        for (CartItem cartItem : cartItems) {
            Product product = productRepository.findById(cartItem.getProduct().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Product no longer exists: " + cartItem.getProduct().getName()));

            if (cartItem.getQuantity() > product.getStockQuantity()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Only " + product.getStockQuantity() + " of " + product.getName() + " left in stock");
            }

            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
            productRepository.save(product);

            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            total = total.add(subtotal);

            order.addItem(OrderItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .unitPrice(product.getPrice())
                    .quantity(cartItem.getQuantity())
                    .subtotal(subtotal)
                    .build());
        }

        order.setTotalAmount(total);
        Order saved = orderRepository.save(order);

        if (payment != null) {
            paymentService.complete(payment, total, saved);
        }

        cartItemRepository.deleteByUserId(userId);

        // Handled after this transaction commits (see OrderNotificationListener)
        eventPublisher.publishEvent(new OrderPlacedEvent(saved.getId(), OrderMessageFormatter.newOrder(saved)));

        return OrderResponse.from(saved);
    }

    public List<OrderResponse> getMyOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(OrderResponse::from)
                .toList();
    }

    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(OrderResponse::from)
                .toList();
    }

    public OrderResponse getOrderById(Long orderId, Long requesterId, boolean isAdmin) {
        Order order = findEntityById(orderId);

        if (!isAdmin && !order.getUser().getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
        }

        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus newStatus) {
        Order order = findEntityById(orderId);
        order.setStatus(newStatus);
        return OrderResponse.from(orderRepository.save(order));
    }

    private Order findEntityById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }
}
