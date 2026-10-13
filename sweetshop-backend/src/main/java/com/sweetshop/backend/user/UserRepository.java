package com.sweetshop.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Locale;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    /** Emails are stored and compared trimmed and lower-case: "Asha@Example.com" is the same account. */
    static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    Optional<User> findByEmail(String email);

    Optional<User> findFirstByEmailIgnoreCaseOrderByIdAsc(String email);

    boolean existsByEmailIgnoreCase(String email);

    /**
     * Exact match first (every account created since emails are normalized, and JWT subjects), then a
     * case-insensitive fallback for older accounts that were stored with capitals.
     */
    default Optional<User> findByLoginEmail(String email) {
        return findByEmail(email).or(() -> findFirstByEmailIgnoreCaseOrderByIdAsc(email));
    }
}
