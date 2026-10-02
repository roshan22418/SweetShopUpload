package com.sweetshop.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.expiresAt < :now")
    void deleteExpired(@Param("now") LocalDateTime now);
}
