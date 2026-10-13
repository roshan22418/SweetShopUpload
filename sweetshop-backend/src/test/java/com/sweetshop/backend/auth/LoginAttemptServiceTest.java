package com.sweetshop.backend.auth;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptServiceTest {

    /** A clock the test can move forward. */
    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T10:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override public Instant instant() { return now; }
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
    }

    private final MutableClock clock = new MutableClock();
    private final LoginAttemptService limiter = new LoginAttemptService(3, Duration.ofMinutes(15), clock);

    private void fail(String email, int times) {
        for (int i = 0; i < times; i++) limiter.recordFailure(email);
    }

    @Test
    void locksOutAfterTooManyFailures() {
        fail("a@x.test", 2);
        assertThatCode(() -> limiter.checkAllowed("a@x.test")).doesNotThrowAnyException();

        fail("a@x.test", 1);

        assertThatThrownBy(() -> limiter.checkAllowed("a@x.test"))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(e.getReason()).contains("15 minutes");
                });
    }

    @Test
    void lockoutIsPerAccount() {
        fail("a@x.test", 3);
        assertThatCode(() -> limiter.checkAllowed("b@x.test")).doesNotThrowAnyException();
    }

    @Test
    void lockoutEndsAfterTheWindow() {
        fail("a@x.test", 3);
        clock.advance(Duration.ofMinutes(14));
        assertThatThrownBy(() -> limiter.checkAllowed("a@x.test")).hasMessageContaining("1 minute");

        clock.advance(Duration.ofMinutes(1));

        assertThatCode(() -> limiter.checkAllowed("a@x.test")).doesNotThrowAnyException();
    }

    @Test
    void successClearsTheCount() {
        fail("a@x.test", 2);
        limiter.recordSuccess("a@x.test");
        fail("a@x.test", 2);

        assertThatCode(() -> limiter.checkAllowed("a@x.test")).doesNotThrowAnyException();
    }

    @Test
    void oldFailuresDoNotAccumulateAcrossWindows() {
        fail("a@x.test", 2);
        clock.advance(Duration.ofMinutes(16));
        fail("a@x.test", 2);

        assertThatCode(() -> limiter.checkAllowed("a@x.test")).doesNotThrowAnyException();
    }
}
