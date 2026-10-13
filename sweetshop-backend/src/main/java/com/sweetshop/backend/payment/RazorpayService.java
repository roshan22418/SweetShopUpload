package com.sweetshop.backend.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String keyId;
    private final String keySecret;
    private final String apiBase;
    private final RestClient restClient;

    public RazorpayService(
            @Value("${razorpay.key-id}") String keyId,
            @Value("${razorpay.key-secret}") String keySecret,
            @Value("${razorpay.api-base}") String apiBase) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.apiBase = apiBase;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(20));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public String getKeyId() {
        return keyId;
    }

    public boolean isConfigured() {
        return StringUtils.hasText(keyId) && StringUtils.hasText(keySecret);
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

        Map<?, ?> response;
        try {
            response = restClient.post()
                    .uri(apiBase + "/v1/orders")
                    .headers(headers -> headers.setBasicAuth(keyId, keySecret))
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            // Never echo the gateway's message to the customer: it can include account details.
            log.warn("Razorpay order creation failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not start online payment, please try again");
        }

        if (response == null || response.get("id") == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not start online payment, please try again");
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
        if (!isConfigured()) {
            log.warn("Online payment requested but Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Online payment is not available right now — please choose pay at counter / on delivery"
            );
        }
    }
}
