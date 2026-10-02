package com.sweetshop.backend.order;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    boolean existsByOrder_User_IdAndProduct_Id(Long userId, Long productId);
}
