package com.sweetshop.backend.order;

import com.sweetshop.backend.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

class CheckoutStockIntegrationTest extends IntegrationTestSupport {

    private String admin;
    private long categoryId;

    @BeforeEach
    void setUp() throws Exception {
        admin = registerAdmin();
        categoryId = createCategory(admin);
    }

    @Test
    void concurrentCheckoutsNeverSellMoreThanTheStock() throws Exception {
        int customers = 8;
        long lastSlice = createProduct(admin, categoryId, "100.00", 1);
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < customers; i++) {
            String token = registerCustomer();
            addToCart(token, lastSlice, 1);
            tokens.add(token);
        }

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(customers);
        List<Future<Integer>> results = new ArrayList<>();
        for (String token : tokens) {
            results.add(pool.submit(() -> {
                start.await();
                return checkoutCod(token).getResponse().getStatus();
            }));
        }
        start.countDown();

        int created = 0;
        for (Future<Integer> result : results) {
            int status = result.get();
            assertThat(status).isIn(201, 409);
            if (status == 201) created++;
        }
        pool.shutdown();

        assertThat(created).as("orders created for 1 unit of stock").isEqualTo(1);
        assertThat(stockOf(lastSlice)).isZero();
    }

    @Test
    void productHiddenAfterBeingAddedToCartCannotBeOrdered() throws Exception {
        String customer = registerCustomer();
        long seasonal = createProduct(admin, categoryId, "99.00", 10);
        addToCart(customer, seasonal, 2);

        // admin takes it off sale while it is still sitting in the customer's cart
        putAs(admin, "/api/products/" + seasonal, json(
                "categoryId", categoryId, "name", "Seasonal special", "price", 99, "unit", "1 piece",
                "stockQuantity", 10, "isAvailable", false));

        MvcResult result = checkoutCod(customer);

        assertThat(result.getResponse().getStatus()).isEqualTo(409);
        assertThat(body(result).get("message").asString()).contains("no longer available");
        assertThat(stockOf(seasonal)).isEqualTo(10);
    }

    @Test
    void checkoutDeductsStockForEveryLine() throws Exception {
        String customer = registerCustomer();
        long cake = createProduct(admin, categoryId, "450.00", 5);
        long samosa = createProduct(admin, categoryId, "18.00", 40);
        addToCart(customer, cake, 2);
        addToCart(customer, samosa, 6);

        MvcResult result = checkoutCod(customer);

        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        assertThat(body(result).get("totalAmount").decimalValue()).isEqualByComparingTo("1008.00");
        assertThat(stockOf(cake)).isEqualTo(3);
        assertThat(stockOf(samosa)).isEqualTo(34);
        assertThat(body(getAs(customer, "/api/cart")).get("items")).isEmpty();
    }
}
