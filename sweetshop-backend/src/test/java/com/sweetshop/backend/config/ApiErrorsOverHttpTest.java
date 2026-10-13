package com.sweetshop.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The error contract checked over a real socket, where Tomcat's error page and Spring Security's filters
 * (not just MVC, as in ApiErrorsIntegrationTest) decide what the client actually receives.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiErrorsOverHttpTest {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
    }

    private String registerAndGetToken() throws Exception {
        String body = "{\"fullName\":\"Http Test\",\"email\":\"http-" + UUID.randomUUID()
                + "@example.test\",\"password\":\"password123\"}";
        HttpResponse<String> response = send(request("/api/auth/register")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)));
        return JsonMapper.builder().build().readTree(response.body()).get("token").asString();
    }

    /** See {@link TestOnlyExplodingController}: stands in for any unexpected bug. */
    @Test
    void unexpectedErrorDoesNotLeakItsMessage() throws Exception {
        HttpResponse<String> response = send(request("/api/test-only/boom")
                .header("Authorization", "Bearer " + registerAndGetToken()).GET());

        assertThat(response.statusCode()).isEqualTo(500);
        assertThat(response.body())
                .contains("\"message\"")
                .doesNotContain("db-internal")
                .doesNotContain("sweetshop_rw");
    }

    @Test
    void anonymousCallToAProtectedEndpointGetsAJsonBody() throws Exception {
        HttpResponse<String> response = send(request("/api/cart").GET());

        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.headers().firstValue("Content-Type")).hasValueSatisfying(ct -> assertThat(ct).contains("json"));
        assertThat(response.body()).contains("\"status\":401").contains("\"message\"");
    }
}
