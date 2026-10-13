package com.sweetshop.backend;

import com.sun.net.httpserver.HttpServer;
import com.sweetshop.backend.user.Role;
import com.sweetshop.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Base for end-to-end API tests: the real application context, real Flyway schema and a real Postgres
 * (the same local database the app uses — see application.properties / DB_URL). Every test creates its
 * own uniquely named users, categories and products, so tests never depend on each other or on whatever
 * data is already in the database. All subclasses share one Spring context (same properties).
 *
 * Razorpay's REST API is replaced by a tiny local stub so payment tests never touch the network.
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class IntegrationTestSupport {

    protected static final String RAZORPAY_TEST_SECRET = "integration-test-secret";
    protected static final JsonMapper JSON = JsonMapper.builder().build();

    private static final AtomicInteger RAZORPAY_ORDER_SEQ = new AtomicInteger();
    private static final HttpServer RAZORPAY_STUB = startRazorpayStub();

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected UserRepository userRepository;

    @DynamicPropertySource
    static void testProperties(DynamicPropertyRegistry registry) {
        registry.add("razorpay.key-id", () -> "rzp_test_integration");
        registry.add("razorpay.key-secret", () -> RAZORPAY_TEST_SECRET);
        registry.add("razorpay.api-base", () -> "http://127.0.0.1:" + RAZORPAY_STUB.getAddress().getPort());
    }

    private static HttpServer startRazorpayStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/v1/orders", exchange -> {
                exchange.getRequestBody().readAllBytes();
                byte[] out = ("{\"id\":\"order_stub_" + System.nanoTime() + "_" + RAZORPAY_ORDER_SEQ.incrementAndGet()
                        + "\",\"status\":\"created\"}").getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, out.length);
                exchange.getResponseBody().write(out);
                exchange.close();
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ---- request helpers ----

    protected static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    protected static String json(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return JSON.writeValueAsString(map);
    }

    protected static JsonNode body(MvcResult result) {
        try {
            return JSON.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    protected MvcResult perform(MockHttpServletRequestBuilder request, String token, String jsonBody) throws Exception {
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (jsonBody != null) request.contentType(MediaType.APPLICATION_JSON).content(jsonBody);
        return mvc.perform(request).andReturn();
    }

    protected MvcResult getAs(String token, String path) throws Exception {
        return perform(get(path), token, null);
    }

    protected MvcResult postAs(String token, String path, String jsonBody) throws Exception {
        return perform(post(path), token, jsonBody);
    }

    protected MvcResult putAs(String token, String path, String jsonBody) throws Exception {
        return perform(put(path), token, jsonBody);
    }

    protected MvcResult patchAs(String token, String path, String jsonBody) throws Exception {
        return perform(patch(path), token, jsonBody);
    }

    protected MvcResult deleteAs(String token, String path) throws Exception {
        return perform(delete(path), token, null);
    }

    // ---- domain helpers ----

    /** Registers a new customer with a unique email and returns their access token. */
    protected String registerCustomer() throws Exception {
        return register(unique("customer") + "@example.test");
    }

    protected String register(String email) throws Exception {
        MvcResult result = postAs(null, "/api/auth/register",
                json("fullName", "Test Customer", "email", email, "password", "password123"));
        if (result.getResponse().getStatus() != 201) {
            throw new IllegalStateException("register failed: " + result.getResponse().getContentAsString());
        }
        return body(result).get("token").asString();
    }

    /** Registers a user and promotes them to ADMIN (roles are read from the DB on every request). */
    protected String registerAdmin() throws Exception {
        String email = unique("admin") + "@example.test";
        String token = register(email);
        var user = userRepository.findByEmail(email).orElseThrow();
        user.setRole(Role.ADMIN);
        userRepository.save(user);
        return token;
    }

    protected long createCategory(String adminToken) throws Exception {
        MvcResult result = postAs(adminToken, "/api/categories", json("name", unique("Category")));
        return body(result).get("id").asLong();
    }

    protected long createProduct(String adminToken, long categoryId, String price, int stock) throws Exception {
        MvcResult result = postAs(adminToken, "/api/products", json(
                "categoryId", categoryId, "name", unique("Product"), "price", new BigDecimal(price),
                "unit", "1 piece", "stockQuantity", stock, "isAvailable", true));
        if (result.getResponse().getStatus() != 201) {
            throw new IllegalStateException("create product failed: " + result.getResponse().getContentAsString());
        }
        return body(result).get("id").asLong();
    }

    protected void addToCart(String token, long productId, int quantity) throws Exception {
        MvcResult result = postAs(token, "/api/cart/items", json("productId", productId, "quantity", quantity));
        if (result.getResponse().getStatus() != 200) {
            throw new IllegalStateException("add to cart failed: " + result.getResponse().getContentAsString());
        }
    }

    protected int stockOf(long productId) throws Exception {
        return body(getAs(registerAdmin(), "/api/products/" + productId)).get("stockQuantity").asInt();
    }

    protected MvcResult checkoutCod(String token) throws Exception {
        return postAs(token, "/api/orders", json("fulfillmentType", "TAKEAWAY", "contactPhone", "9876543210"));
    }
}
