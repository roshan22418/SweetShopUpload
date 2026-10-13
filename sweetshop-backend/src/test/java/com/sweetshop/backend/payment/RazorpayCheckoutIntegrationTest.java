package com.sweetshop.backend.payment;

import com.sweetshop.backend.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Online payment must pay for exactly the cart it was started for, exactly once. The signature
 * Razorpay returns only proves "this Razorpay order was paid" — the server has to tie that order to
 * the customer and the amount itself.
 */
class RazorpayCheckoutIntegrationTest extends IntegrationTestSupport {

    private String admin;
    private long categoryId;

    @BeforeEach
    void setUp() throws Exception {
        admin = registerAdmin();
        categoryId = createCategory(admin);
    }

    /** What Razorpay hands the browser after a successful payment for {@code razorpayOrderId}. */
    private static String signature(String razorpayOrderId, String razorpayPaymentId) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(RAZORPAY_TEST_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(
                mac.doFinal((razorpayOrderId + "|" + razorpayPaymentId).getBytes(StandardCharsets.UTF_8)));
    }

    private String startPayment(String token) throws Exception {
        MvcResult result = postAs(token, "/api/payments/razorpay/order", null);
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(200);
        return body(result).get("razorpayOrderId").asString();
    }

    private MvcResult payAndCheckout(String token, String razorpayOrderId, String paymentId) throws Exception {
        return postAs(token, "/api/orders", json(
                "fulfillmentType", "TAKEAWAY", "contactPhone", "9876543210", "paymentMethod", "RAZORPAY",
                "razorpayOrderId", razorpayOrderId, "razorpayPaymentId", paymentId,
                "razorpaySignature", signature(razorpayOrderId, paymentId)));
    }

    @Test
    void paidCartBecomesPaidOrder() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        addToCart(customer, cake, 2);

        String razorpayOrderId = startPayment(customer);
        MvcResult result = payAndCheckout(customer, razorpayOrderId, unique("pay"));

        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        JsonNode order = body(result);
        assertThat(order.get("paymentStatus").asString()).isEqualTo("PAID");
        assertThat(order.get("totalAmount").decimalValue()).isEqualByComparingTo("900.00");
        assertThat(stockOf(cake)).isEqualTo(3);
    }

    @Test
    void paymentCannotBeReusedForASecondOrder() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 10);
        addToCart(customer, cake, 1);
        String razorpayOrderId = startPayment(customer);
        String paymentId = unique("pay");
        assertThat(payAndCheckout(customer, razorpayOrderId, paymentId).getResponse().getStatus()).isEqualTo(201);

        addToCart(customer, cake, 1);
        MvcResult replay = payAndCheckout(customer, razorpayOrderId, paymentId);

        assertThat(replay.getResponse().getStatus()).isEqualTo(409);
        assertThat(body(replay).get("message").asString()).contains("already been used");
        assertThat(stockOf(cake)).as("replay must not take stock").isEqualTo(9);
    }

    @Test
    void cartChangedAfterPaymentStartedIsRefused() throws Exception {
        String customer = registerCustomer();
        long samosa = createProduct(admin, categoryId, "18.00", 50);
        long cake = createProduct(admin, categoryId, "1250.00", 5);
        addToCart(customer, samosa, 1);
        String razorpayOrderId = startPayment(customer); // asked to pay ₹18

        addToCart(customer, cake, 1); // cart is now ₹1268
        MvcResult result = payAndCheckout(customer, razorpayOrderId, unique("pay"));

        assertThat(result.getResponse().getStatus()).isEqualTo(409);
        assertThat(body(result).get("message").asString()).contains("cart changed");
        assertThat(stockOf(cake)).isEqualTo(5);
        assertThat(stockOf(samosa)).isEqualTo(50);
    }

    @Test
    void validSignatureForAnUnknownRazorpayOrderIsRefused() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        addToCart(customer, cake, 1);

        // correctly signed, but for a Razorpay order this shop never created for this customer
        MvcResult result = payAndCheckout(customer, "order_not_from_us", unique("pay"));

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(stockOf(cake)).isEqualTo(5);
    }

    @Test
    void anotherCustomersPaymentCannotBeUsed() throws Exception {
        String payer = registerCustomer();
        String other = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        addToCart(payer, cake, 1);
        addToCart(other, cake, 1);
        String payersOrder = startPayment(payer);

        MvcResult result = payAndCheckout(other, payersOrder, unique("pay"));

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(stockOf(cake)).isEqualTo(5);
    }

    @Test
    void badSignatureHasNoSideEffects() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        addToCart(customer, cake, 1);
        String razorpayOrderId = startPayment(customer);

        MvcResult result = postAs(customer, "/api/orders", json(
                "fulfillmentType", "TAKEAWAY", "contactPhone", "9876543210", "paymentMethod", "RAZORPAY",
                "razorpayOrderId", razorpayOrderId, "razorpayPaymentId", "pay_x", "razorpaySignature", "forged"));

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(stockOf(cake)).isEqualTo(5);
        assertThat(body(getAs(customer, "/api/cart")).get("items")).hasSize(1);
    }
}
