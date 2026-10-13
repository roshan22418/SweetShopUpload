package com.sweetshop.backend.order;

import com.sweetshop.backend.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;

class OrderCancellationIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private OrderRepository orderRepository;

    private String admin;
    private long categoryId;

    @BeforeEach
    void setUp() throws Exception {
        admin = registerAdmin();
        categoryId = createCategory(admin);
    }

    private long placeOrder(String customer, long productId, int quantity) throws Exception {
        addToCart(customer, productId, quantity);
        MvcResult result = checkoutCod(customer);
        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        return body(result).get("id").asLong();
    }

    private MvcResult setStatus(long orderId, String status) throws Exception {
        return patchAs(admin, "/api/orders/" + orderId + "/status", json("status", status));
    }

    @Test
    void adminCancellingAnOrderPutsItsStockBack() throws Exception {
        String customer = registerCustomer();
        long samosa = createProduct(admin, categoryId, "18.00", 50);
        long orderId = placeOrder(customer, samosa, 5);
        assertThat(stockOf(samosa)).isEqualTo(45);

        MvcResult result = setStatus(orderId, "CANCELLED");

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(stockOf(samosa)).isEqualTo(50);
    }

    @Test
    void cancelledAndCompletedOrdersAreFinal() throws Exception {
        String customer = registerCustomer();
        long samosa = createProduct(admin, categoryId, "18.00", 50);
        long cancelled = placeOrder(customer, samosa, 5);
        long completed = placeOrder(customer, samosa, 1);
        setStatus(cancelled, "CANCELLED");
        setStatus(completed, "COMPLETED");

        MvcResult reopen = setStatus(cancelled, "COMPLETED");
        MvcResult undo = setStatus(completed, "PENDING");

        assertThat(reopen.getResponse().getStatus()).isEqualTo(409);
        assertThat(body(reopen).get("message").asString()).contains("CANCELLED");
        assertThat(undo.getResponse().getStatus()).isEqualTo(409);
        assertThat(stockOf(samosa)).as("re-opening must not double-count stock").isEqualTo(49);
    }

    @Test
    void normalFulfilmentFlowStillWorks() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        long orderId = placeOrder(customer, cake, 1);

        assertThat(setStatus(orderId, "CONFIRMED").getResponse().getStatus()).isEqualTo(200);
        assertThat(setStatus(orderId, "CONFIRMED").getResponse().getStatus()).as("no-op").isEqualTo(200);
        assertThat(body(setStatus(orderId, "COMPLETED")).get("status").asString()).isEqualTo("COMPLETED");
        assertThat(stockOf(cake)).isEqualTo(4);
    }

    @Test
    void customerCanCancelTheirOwnPendingOrder() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        long orderId = placeOrder(customer, cake, 2);

        MvcResult result = postAs(customer, "/api/orders/" + orderId + "/cancel", null);

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(result).get("status").asString()).isEqualTo("CANCELLED");
        assertThat(stockOf(cake)).isEqualTo(5);
    }

    @Test
    void customerCannotCancelOnceTheShopHasConfirmed() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        long orderId = placeOrder(customer, cake, 1);
        setStatus(orderId, "CONFIRMED");

        MvcResult result = postAs(customer, "/api/orders/" + orderId + "/cancel", null);

        assertThat(result.getResponse().getStatus()).isEqualTo(409);
        assertThat(stockOf(cake)).isEqualTo(4);
    }

    @Test
    void customerCannotCancelSomeoneElsesOrder() throws Exception {
        String owner = registerCustomer();
        String stranger = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        long orderId = placeOrder(owner, cake, 1);

        MvcResult result = postAs(stranger, "/api/orders/" + orderId + "/cancel", null);

        assertThat(result.getResponse().getStatus()).isEqualTo(404);
        assertThat(orderRepository.findById(orderId).map(o -> o.getStatus().name())).contains("PENDING");
    }

    @Test
    void paidOnlineOrdersAreCancelledByTheShopNotSelfService() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        long orderId = placeOrder(customer, cake, 1);
        // mark it as paid online, as a Razorpay checkout would have
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.setPaymentMethod(PaymentMethod.RAZORPAY);
        order.setPaymentStatus(PaymentStatus.PAID);
        orderRepository.save(order);

        MvcResult result = postAs(customer, "/api/orders/" + orderId + "/cancel", null);

        assertThat(result.getResponse().getStatus()).isEqualTo(409);
        assertThat(body(result).get("message").asString()).contains("paid online");
    }
}
