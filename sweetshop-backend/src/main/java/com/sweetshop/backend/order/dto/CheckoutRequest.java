package com.sweetshop.backend.order.dto;

import com.sweetshop.backend.order.FulfillmentType;
import com.sweetshop.backend.order.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CheckoutRequest {

    @NotNull(message = "Fulfillment type is required")
    private FulfillmentType fulfillmentType;

    @NotBlank(message = "Contact phone is required")
    @Size(max = 20, message = "Contact phone must be at most 20 characters")
    @Pattern(regexp = "^\\+?[0-9][0-9 ()-]{6,}$", message = "Enter a valid phone number, e.g. 9876543210")
    private String contactPhone;

    // Required only when fulfillmentType is DELIVERY; validated in the service layer.
    @Size(max = 500, message = "Delivery address must be at most 500 characters")
    private String deliveryAddress;

    // Defaults to COD when absent (keeps existing pay-at-counter callers working unmodified).
    private PaymentMethod paymentMethod;

    // Required only when paymentMethod is RAZORPAY; validated in the service layer.
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
}
