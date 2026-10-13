package com.sweetshop.backend.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test classpath only: an endpoint that fails the way an unexpected bug would, with an internal-looking
 * message, so ApiErrorsIntegrationTest can prove such details never reach the client. Top-level (not nested
 * in the test class) because Spring Boot's test scanning skips classes nested inside test classes.
 */
@RestController
class TestOnlyExplodingController {

    @GetMapping("/api/test-only/boom")
    String boom() {
        throw new IllegalStateException("connection to db-internal-7.prod:5432 refused for user sweetshop_rw");
    }
}
