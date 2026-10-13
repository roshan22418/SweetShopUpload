package com.sweetshop.backend.payment;

import com.sweetshop.backend.payment.dto.RazorpayOrderResponse;
import com.sweetshop.backend.user.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/razorpay")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/order")
    public RazorpayOrderResponse createOrder(@AuthenticationPrincipal UserPrincipal principal) {
        return paymentService.startRazorpayPayment(principal.getId());
    }
}
