package com.sweetshop.backend.auth;

import com.sweetshop.backend.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;

/** Email identity and request-size validation: bad input is a clear 400, never a 500 or a confusing 409. */
class AccountInputIntegrationTest extends IntegrationTestSupport {

    private MvcResult register(String fullName, String email, String password, String phone) throws Exception {
        return postAs(null, "/api/auth/register",
                json("fullName", fullName, "email", email, "password", password, "phoneNumber", phone));
    }

    @Test
    void emailIsCaseInsensitiveForLogin() throws Exception {
        String local = unique("Mixed.Case");
        register("Asha Rao", local + "@Example.TEST", "password123", null);

        MvcResult login = postAs(null, "/api/auth/login",
                json("email", "  " + local.toLowerCase() + "@example.test ", "password", "password123"));

        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(login).get("email").asString()).isEqualTo(local.toLowerCase() + "@example.test");
    }

    @Test
    void sameAddressInDifferentCaseCannotRegisterTwice() throws Exception {
        String local = unique("dup");
        assertThat(register("First", local + "@example.test", "password123", null).getResponse().getStatus()).isEqualTo(201);

        MvcResult second = register("Second", local.toUpperCase() + "@EXAMPLE.test", "password123", null);

        assertThat(second.getResponse().getStatus()).isEqualTo(409);
    }

    @Test
    void overlongPasswordIsAValidationErrorNotACrash() throws Exception {
        MvcResult result = register("Long Pass", unique("pw") + "@example.test", "a".repeat(80), null);

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(result).get("errors").get("password").asString()).contains("72");
    }

    @Test
    void overlongNameAndPhoneAreValidationErrors() throws Exception {
        MvcResult result = register("N".repeat(200), unique("long") + "@example.test", "password123", "1".repeat(24));

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(result).get("errors").has("fullName")).isTrue();
        assertThat(body(result).get("errors").has("phoneNumber")).isTrue();
    }

    @Test
    void checkoutRejectsAnInvalidPhoneNumberWithAFieldError() throws Exception {
        String admin = registerAdmin();
        long product = createProduct(admin, createCategory(admin), "18.00", 10);
        String customer = registerCustomer();
        addToCart(customer, product, 1);

        MvcResult tooLong = postAs(customer, "/api/orders",
                json("fulfillmentType", "TAKEAWAY", "contactPhone", "1234567890123456789012345"));
        MvcResult notAPhone = postAs(customer, "/api/orders",
                json("fulfillmentType", "TAKEAWAY", "contactPhone", "call me maybe"));

        assertThat(tooLong.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(tooLong).get("errors").has("contactPhone")).isTrue();
        assertThat(notAPhone.getResponse().getStatus()).isEqualTo(400);
        assertThat(stockOf(product)).isEqualTo(10);
    }

    @Test
    void overlongProductImageUrlIsAValidationError() throws Exception {
        String admin = registerAdmin();
        MvcResult result = postAs(admin, "/api/products", json(
                "categoryId", createCategory(admin), "name", "Cake", "price", 10, "unit", "1 piece",
                "stockQuantity", 1, "imageUrl", "https://example.test/" + "x".repeat(600)));

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(result).get("errors").has("imageUrl")).isTrue();
    }
}
