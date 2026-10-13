package com.sweetshop.backend.auth;

import com.sweetshop.backend.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;

class SessionSecurityIntegrationTest extends IntegrationTestSupport {

    @Test
    void tokenOfADeletedAccountIsJustUnauthenticated() throws Exception {
        String email = unique("gone") + "@example.test";
        String token = register(email);
        userRepository.delete(userRepository.findByEmail(email).orElseThrow());

        MvcResult result = getAs(token, "/api/users/me");

        assertThat(result.getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void publicEndpointsStillWorkWithAStaleToken() throws Exception {
        String email = unique("gone") + "@example.test";
        String token = register(email);
        userRepository.delete(userRepository.findByEmail(email).orElseThrow());

        assertThat(getAs(token, "/api/categories").getResponse().getStatus()).isEqualTo(200);
    }
}
