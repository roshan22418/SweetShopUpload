package com.sweetshop.backend.cart;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    /** Plain lookup for checkout: products stay unloaded so the row-locking query reads fresh stock. */
    List<CartItem> findByUserId(Long userId);

    /** For displaying the cart: products in the same query, oldest line first. */
    @EntityGraph(attributePaths = "product")
    List<CartItem> findWithProductByUserIdOrderByIdAsc(Long userId);

    Optional<CartItem> findByUserIdAndProductId(Long userId, Long productId);

    void deleteByUserId(Long userId);
}
