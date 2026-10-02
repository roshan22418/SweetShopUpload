package com.sweetshop.backend.payment;

import com.sweetshop.backend.cart.CartService;
import com.sweetshop.backend.cart.dto.CartResponse;
import com.sweetshop.backend.payment.dto.RazorpayOrderResponse;
import com.sweetshop.backend.user.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/payments/razorpay")
public class PaymentController {

    private final RazorpayService razorpayService;
    private final CartService cartService;

    public PaymentController(RazorpayService razorpayService, CartService cartService) {
        this.razorpayService = razorpayService;
        this.cartService = cartService;
    }

    @PostMapping("/order")
    public RazorpayOrderResponse createOrder(@AuthenticationPrincipal UserPrincipal principal) {
        CartResponse cart = cartService.getCart(principal.getId());
        if (cart.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        String razorpayOrderId = razorpayService.createOrder(cart.getTotalAmount());
        return new RazorpayOrderResponse(razorpayOrderId, cart.getTotalAmount(), "INR", razorpayService.getKeyId());
    }
}
