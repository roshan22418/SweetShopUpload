package com.sweetshop.backend.order.dto;

import com.sweetshop.backend.order.FulfillmentType;
import com.sweetshop.backend.order.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CheckoutRequest {

    @NotNull(message = "Fulfillment type is required")
    private FulfillmentType fulfillmentType;

    @NotBlank(message = "Contact phone is required")
    private String contactPhone;

    // Required only when fulfillmentType is DELIVERY; validated in the service layer.
    private String deliveryAddress;

    // Defaults to COD when absent (keeps existing pay-at-counter callers working unmodified).
    private PaymentMethod paymentMethod;

    // Required only when paymentMethod is RAZORPAY; validated in the service layer.
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
}
