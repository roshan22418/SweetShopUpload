package com.sweetshop.backend.order;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // Customer + line items in the same query; otherwise each order costs 2 extra queries (N+1).
    @EntityGraph(attributePaths = {"user", "items"})
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"user", "items"})
    List<Order> findAllByOrderByCreatedAtDesc();
}
