package com.sweetshop.backend.auth;

import com.sweetshop.backend.IntegrationTestSupport;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

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

    private static Cookie refreshCookie(MvcResult authResult) {
        return authResult.getResponse().getCookie("refresh_token");
    }

    private MvcResult refreshWith(Cookie cookie) throws Exception {
        return mvc.perform(post("/api/auth/refresh").cookie(cookie)).andReturn();
    }

    @Test
    void changingPasswordSignsOutEveryOtherDevice() throws Exception {
        String email = unique("pw") + "@example.test";
        MvcResult phone = postAs(null, "/api/auth/register",
                json("fullName", "Two Devices", "email", email, "password", "old-password-1"));
        MvcResult laptop = postAs(null, "/api/auth/login", json("email", email, "password", "old-password-1"));
        String laptopToken = body(laptop).get("token").asString();

        MvcResult change = putAs(laptopToken, "/api/users/me/password",
                json("currentPassword", "old-password-1", "newPassword", "new-password-2"));
        assertThat(change.getResponse().getStatus()).isEqualTo(204);

        assertThat(refreshWith(refreshCookie(phone)).getResponse().getStatus())
                .as("the other device's refresh token must be revoked").isEqualTo(401);
        assertThat(refreshWith(refreshCookie(laptop)).getResponse().getStatus()).isEqualTo(401);
        assertThat(postAs(null, "/api/auth/login", json("email", email, "password", "old-password-1"))
                .getResponse().getStatus()).isEqualTo(401);
        assertThat(postAs(null, "/api/auth/login", json("email", email, "password", "new-password-2"))
                .getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void refreshTokenRotationStillWorks() throws Exception {
        MvcResult registered = postAs(null, "/api/auth/register",
                json("fullName", "Rotator", "email", unique("rot") + "@example.test", "password", "password123"));

        MvcResult first = refreshWith(refreshCookie(registered));
        MvcResult reuse = refreshWith(refreshCookie(registered));

        assertThat(first.getResponse().getStatus()).isEqualTo(200);
        assertThat(reuse.getResponse().getStatus()).as("reusing a rotated token is treated as theft").isEqualTo(401);
        assertThat(refreshWith(refreshCookie(first)).getResponse().getStatus())
                .as("theft detection revokes the whole family").isEqualTo(401);
    }

    @Test
    void repeatedWrongPasswordsLockTheAccountTemporarily() throws Exception {
        String email = unique("brute") + "@example.test";
        register(email);
        for (int i = 0; i < 5; i++) {
            assertThat(postAs(null, "/api/auth/login", json("email", email, "password", "guess-" + i))
                    .getResponse().getStatus()).isEqualTo(401);
        }

        MvcResult locked = postAs(null, "/api/auth/login", json("email", email, "password", "password123"));

        assertThat(locked.getResponse().getStatus()).as("even the right password waits out the lockout").isEqualTo(429);
        assertThat(body(locked).get("message").asString()).contains("Too many failed login attempts");
        String other = unique("innocent") + "@example.test";
        register(other);
        assertThat(postAs(null, "/api/auth/login", json("email", other, "password", "password123"))
                .getResponse().getStatus()).as("other accounts are unaffected").isEqualTo(200);
    }
}
