package com.sweetshop.backend;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.assertj.core.api.SoftAssertions;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Read endpoints must run a constant number of SQL statements, not one more per order / product / review
 * (the classic N+1). The shared test database already holds many orders from other tests, which is exactly
 * what makes an N+1 visible here.
 */
class QueryCountIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private Statistics stats;
    private String admin;
    private String customer;
    private long cake;

    @BeforeEach
    void setUp() throws Exception {
        stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        admin = registerAdmin();
        long categoryA = createCategory(admin);
        long categoryB = createCategory(admin);
        cake = createProduct(admin, categoryA, "450.00", 100);
        long samosa = createProduct(admin, categoryB, "18.00", 100);
        customer = registerCustomer();
        for (int i = 0; i < 3; i++) {
            addToCart(customer, cake, 1);
            addToCart(customer, samosa, 2);
            assertThat(checkoutCod(customer).getResponse().getStatus()).isEqualTo(201);
            postAs(customer, "/api/orders/" + body(getAs(customer, "/api/orders")).get(0).get("id").asLong()
                    + "/messages", json("message", "Please pack it well #" + i));
        }
        for (int i = 0; i < 3; i++) {
            String reviewer = registerCustomer();
            addToCart(reviewer, cake, 1);
            checkoutCod(reviewer);
            postAs(reviewer, "/api/products/" + cake + "/reviews", json("rating", 5, "comment", "Lovely"));
        }
        addToCart(customer, cake, 1);
        addToCart(customer, samosa, 1);
    }

    private long statementsFor(String token, String path) throws Exception {
        stats.clear();
        MvcResult result = getAs(token, path);
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        long count = stats.getPrepareStatementCount();
        System.out.printf("[query-count] GET %-36s -> %d SQL statements%n", path, count);
        return count;
    }

    @Test
    void readEndpointsRunAConstantNumberOfQueries() throws Exception {
        long firstOrder = body(getAs(customer, "/api/orders")).get(0).get("id").asLong();

        SoftAssertions softly = new SoftAssertions();
        softly.assertThat(statementsFor(admin, "/api/orders/all")).isLessThanOrEqualTo(3);
        softly.assertThat(statementsFor(customer, "/api/orders")).isLessThanOrEqualTo(3);
        softly.assertThat(statementsFor(null, "/api/products")).isLessThanOrEqualTo(2);
        softly.assertThat(statementsFor(customer, "/api/cart")).isLessThanOrEqualTo(3);
        softly.assertThat(statementsFor(null, "/api/products/" + cake + "/reviews")).isLessThanOrEqualTo(2);
        softly.assertThat(statementsFor(customer, "/api/orders/" + firstOrder + "/messages")).isLessThanOrEqualTo(4);
        softly.assertAll();
    }
}
