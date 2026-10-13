package com.sweetshop.backend.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Brute-force protection for password login: after {@code maxFailures} wrong passwords for one account
 * within the lockout window, further attempts for that account are refused (429) until the window passes.
 * A successful login clears the count.
 *
 * In memory on purpose — this is a single-instance monolith; a restart simply forgets the counts. Keyed by
 * account (normalized email), not IP: behind Netlify/Render every request can share a proxy address.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_TRACKED_ACCOUNTS = 10_000;

    private record Failures(int count, Instant windowStart) {}

    private final Map<String, Failures> failures = new ConcurrentHashMap<>();
    private final int maxFailures;
    private final Duration lockout;
    private final Clock clock;

    @Autowired
    public LoginAttemptService(
            @Value("${auth.login.max-failures:5}") int maxFailures,
            @Value("${auth.login.lockout-minutes:15}") long lockoutMinutes) {
        this(maxFailures, Duration.ofMinutes(lockoutMinutes), Clock.systemUTC());
    }

    LoginAttemptService(int maxFailures, Duration lockout, Clock clock) {
        this.maxFailures = maxFailures;
        this.lockout = lockout;
        this.clock = clock;
    }

    /** Throws 429 while the account is locked out. */
    public void checkAllowed(String email) {
        Failures current = active(email);
        if (current != null && current.count() >= maxFailures) {
            long secondsLeft = Duration.between(clock.instant(), current.windowStart().plus(lockout)).toSeconds();
            long minutes = Math.max(1, (secondsLeft + 59) / 60); // round up: "1 minute" until it's over
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed login attempts. Please try again in " + minutes + " minute" + (minutes == 1 ? "" : "s") + ".");
        }
    }

    public void recordFailure(String email) {
        if (failures.size() >= MAX_TRACKED_ACCOUNTS) {
            pruneExpired();
        }
        Instant now = clock.instant();
        failures.merge(email, new Failures(1, now), (old, ignored) -> isExpired(old, now)
                ? new Failures(1, now)
                : new Failures(old.count() + 1, old.windowStart()));
    }

    public void recordSuccess(String email) {
        failures.remove(email);
    }

    private Failures active(String email) {
        Failures current = failures.get(email);
        if (current != null && isExpired(current, clock.instant())) {
            failures.remove(email, current);
            return null;
        }
        return current;
    }

    private boolean isExpired(Failures f, Instant now) {
        return !now.isBefore(f.windowStart().plus(lockout));
    }

    private void pruneExpired() {
        Instant now = clock.instant();
        failures.values().removeIf(f -> isExpired(f, now));
    }
}
