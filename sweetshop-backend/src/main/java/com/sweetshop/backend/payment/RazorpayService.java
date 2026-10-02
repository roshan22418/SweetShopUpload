package com.sweetshop.backend.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class RazorpayService {

    private static final String RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String keyId;
    private final String keySecret;
    private final RestClient restClient;

    public RazorpayService(
            @Value("${razorpay.key-id}") String keyId,
            @Value("${razorpay.key-secret}") String keySecret) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.restClient = RestClient.create();
    }

    public String getKeyId() {
        return keyId;
    }

    /**
     * Creates a Razorpay Order for the given rupee amount and returns its id.
     * Amount is always computed server-side from the caller's live cart — never trust a client-sent amount.
     */
    public String createOrder(BigDecimal amountInRupees) {
        requireConfigured();

        long amountInPaise = amountInRupees.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValueExact();

        Map<String, Object> body = Map.of(
                "amount", amountInPaise,
                "currency", "INR",
                "receipt", UUID.randomUUID().toString()
        );

        Map<?, ?> response = restClient.post()
                .uri(RAZORPAY_ORDERS_URL)
                .headers(headers -> headers.setBasicAuth(keyId, keySecret))
                .body(body)
                .retrieve()
                .body(Map.class);

        if (response == null || response.get("id") == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Razorpay did not return an order id");
        }

        return response.get("id").toString();
    }

    public boolean verifySignature(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        requireConfigured();

        try {
            String payload = razorpayOrderId + "|" + razorpayPaymentId;
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] computed = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);

            return MessageDigest.isEqual(
                    computedHex.getBytes(StandardCharsets.UTF_8),
                    razorpaySignature.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            return false;
        }
    }

    private void requireConfigured() {
        if (!StringUtils.hasText(keyId) || !StringUtils.hasText(keySecret)) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
            );
        }
    }
}
