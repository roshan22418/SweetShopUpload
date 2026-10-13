package com.sweetshop.backend.message;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderMessageRepository extends JpaRepository<OrderMessage, Long> {

    @EntityGraph(attributePaths = "sender")
    List<OrderMessage> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
