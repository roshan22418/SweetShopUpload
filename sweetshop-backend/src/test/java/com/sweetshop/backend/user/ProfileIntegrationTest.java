package com.sweetshop.backend.user;

import com.sweetshop.backend.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import static org.assertj.core.api.Assertions.assertThat;

class ProfileIntegrationTest extends IntegrationTestSupport {

    @Test
    void profileSaysWhetherTheAccountHasAPassword() throws Exception {
        String email = unique("profile") + "@example.test";
        String token = register(email);
        assertThat(body(getAs(token, "/api/users/me")).get("passwordSet").asBoolean()).isTrue();

        User user = userRepository.findByEmail(email).orElseThrow();
        user.setPasswordSet(false); // as for an account created by Google sign-in
        userRepository.save(user);

        JsonNode profile = body(getAs(token, "/api/users/me"));
        assertThat(profile.get("passwordSet").asBoolean()).isFalse();
        assertThat(putAs(token, "/api/users/me/password",
                json("currentPassword", "password123", "newPassword", "whatever-123")).getResponse().getStatus())
                .isEqualTo(400);
    }
}
