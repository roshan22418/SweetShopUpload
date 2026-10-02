package com.sweetshop.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class RazorpayOrderResponse {
    private String razorpayOrderId;
    private BigDecimal amount;
    private String currency;
    private String keyId;
}
