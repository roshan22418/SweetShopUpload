package com.sweetshop.backend.product;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategoryId(Long categoryId);

    List<Product> findByIsAvailableTrue();

    List<Product> findByCategoryIdAndIsAvailableTrue(Long categoryId);

    // SELECT ... FOR UPDATE: a concurrent checkout of the same product waits here until this one
    // commits, then reads the already-reduced stock — so stock can never be sold twice.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
