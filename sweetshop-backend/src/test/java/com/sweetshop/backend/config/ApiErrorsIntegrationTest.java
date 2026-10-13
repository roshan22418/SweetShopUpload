package com.sweetshop.backend.config;

import com.sweetshop.backend.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Every error, from any layer, has the same {"status", "message"} shape and never leaks internals. */
class ApiErrorsIntegrationTest extends IntegrationTestSupport {

    private String admin;
    private String customer;

    @BeforeEach
    void setUp() throws Exception {
        admin = registerAdmin();
        customer = registerCustomer();
    }

    private static void assertErrorShape(MvcResult result, int status) throws Exception {
        assertThat(result.getResponse().getStatus()).isEqualTo(status);
        assertThat(result.getResponse().getContentType()).startsWith(MediaType.APPLICATION_JSON_VALUE);
        JsonNode body = body(result);
        assertThat(body.get("status").asInt()).isEqualTo(status);
        assertThat(body.get("message").asString()).isNotBlank();
    }

    @Test
    void malformedJsonIsExplained() throws Exception {
        MvcResult result = mvc.perform(post("/api/cart/items").header("Authorization", "Bearer " + customer)
                .contentType(MediaType.APPLICATION_JSON).content("{not json")).andReturn();

        assertErrorShape(result, 400);
        assertThat(body(result).get("message").asString()).contains("JSON");
    }

    @Test
    void invalidEnumValueNamesTheField() throws Exception {
        MvcResult result = postAs(customer, "/api/orders",
                json("fulfillmentType", "TELEPORT", "contactPhone", "9876543210"));

        assertErrorShape(result, 400);
        assertThat(body(result).get("message").asString()).contains("fulfillmentType");
    }

    @Test
    void nonNumericIdIsABadRequest() throws Exception {
        MvcResult result = getAs(null, "/api/products/abc");

        assertErrorShape(result, 400);
        assertThat(body(result).get("message").asString()).doesNotContain("java.lang");
    }

    @Test
    void unknownRouteAndWrongMethod() throws Exception {
        assertErrorShape(getAs(admin, "/api/nope"), 404);
        assertErrorShape(patchAs(admin, "/api/categories", null), 405);
    }

    @Test
    void missingUploadPart() throws Exception {
        MvcResult result = mvc.perform(multipart("/api/products/images")
                .file(new MockMultipartFile("other", "x".getBytes()))
                .header("Authorization", "Bearer " + admin)).andReturn();

        assertErrorShape(result, 400);
        assertThat(body(result).get("message").asString()).contains("file");
    }

    @Test
    void securityErrorsUseTheSameShape() throws Exception {
        assertErrorShape(getAs(null, "/api/cart"), 401);
        assertErrorShape(getAs(customer, "/api/orders/all"), 403);
    }

    /** See {@link TestOnlyExplodingController}: stands in for any unexpected bug. */
    @Test
    void unexpectedErrorsAreGenericAndDoNotLeakDetails() throws Exception {
        MvcResult result = getAs(admin, "/api/test-only/boom");

        assertErrorShape(result, 500);
        String raw = result.getResponse().getContentAsString();
        assertThat(raw).doesNotContain("db-internal").doesNotContain("sweetshop_rw").doesNotContain("Exception");
    }
}
