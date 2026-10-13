package com.sweetshop.backend.payment;

import com.sweetshop.backend.cart.CartService;
import com.sweetshop.backend.cart.dto.CartResponse;
import com.sweetshop.backend.order.Order;
import com.sweetshop.backend.payment.dto.RazorpayOrderResponse;
import com.sweetshop.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

/**
 * Online payment bookkeeping. Starting a payment records which customer and amount a Razorpay order is
 * for; checkout then {@link #claim claims} it — once — for an order of exactly that amount.
 */
@Service
public class PaymentService {

    private static final String CURRENCY = "INR";

    private final RazorpayService razorpayService;
    private final RazorpayPaymentRepository paymentRepository;
    private final CartService cartService;
    private final UserRepository userRepository;

    public PaymentService(
            RazorpayService razorpayService,
            RazorpayPaymentRepository paymentRepository,
            CartService cartService,
            UserRepository userRepository) {
        this.razorpayService = razorpayService;
        this.paymentRepository = paymentRepository;
        this.cartService = cartService;
        this.userRepository = userRepository;
    }

    /**
     * Creates a Razorpay order for the caller's live cart total (never a client-sent amount). Deliberately
     * not one transaction: no DB connection is held while waiting on the payment gateway.
     */
    public RazorpayOrderResponse startRazorpayPayment(Long userId) {
        CartResponse cart = cartService.getCart(userId);
        if (cart.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        String razorpayOrderId = razorpayService.createOrder(cart.getTotalAmount());
        paymentRepository.save(RazorpayPayment.builder()
                .razorpayOrderId(razorpayOrderId)
                .user(userRepository.getReferenceById(userId))
                .amount(cart.getTotalAmount())
                .build());

        return new RazorpayOrderResponse(razorpayOrderId, cart.getTotalAmount(), CURRENCY, razorpayService.getKeyId());
    }

    /**
     * Verifies Razorpay's signature and that the payment was started by this customer and hasn't paid for
     * anything yet. Returns the (row-locked) payment; the caller must {@link #complete} it with the new order
     * after checking the amount, all inside the checkout transaction.
     */
    public RazorpayPayment claim(Long userId, String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        if (!StringUtils.hasText(razorpayOrderId)
                || !StringUtils.hasText(razorpayPaymentId)
                || !StringUtils.hasText(razorpaySignature)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment details are required for online payment");
        }
        if (!razorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment verification failed");
        }

        RazorpayPayment payment = paymentRepository.findByRazorpayOrderIdForUpdate(razorpayOrderId)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment not recognised"));

        if (payment.getOrder() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This payment has already been used for order #" + payment.getOrder().getId());
        }
        return payment;
    }

    /** Refuses the order unless its total is exactly what the customer paid, then marks the payment used. */
    public void complete(RazorpayPayment payment, BigDecimal orderTotal, Order order) {
        if (payment.getAmount().compareTo(orderTotal) != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Your cart changed after payment started (paid ₹" + payment.getAmount().toPlainString()
                            + ", cart is now ₹" + orderTotal.toPlainString() + "). Restore your cart to check out, "
                            + "or contact the shop for a refund of payment " + payment.getRazorpayOrderId() + ".");
        }
        payment.setOrder(order);
        paymentRepository.save(payment);
    }
}
