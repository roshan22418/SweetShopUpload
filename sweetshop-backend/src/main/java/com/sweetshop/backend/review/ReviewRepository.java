package com.sweetshop.backend.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);

    Optional<Review> findByUserIdAndProductId(Long userId, Long productId);
}
