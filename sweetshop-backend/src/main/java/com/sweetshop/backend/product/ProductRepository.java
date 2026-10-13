package com.sweetshop.backend.product;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // Catalog listings: category fetched in the same query (ProductResponse needs its name) and a stable
    // alphabetical order, instead of whatever order Postgres happens to return rows in after updates.

    @EntityGraph(attributePaths = "category")
    List<Product> findAllByOrderByNameAsc();

    @EntityGraph(attributePaths = "category")
    List<Product> findByIsAvailableTrueOrderByNameAsc();

    @EntityGraph(attributePaths = "category")
    List<Product> findByCategoryIdOrderByNameAsc(Long categoryId);

    @EntityGraph(attributePaths = "category")
    List<Product> findByCategoryIdAndIsAvailableTrueOrderByNameAsc(Long categoryId);

    // SELECT ... FOR UPDATE: a concurrent checkout of the same product waits here until this one
    // commits, then reads the already-reduced stock — so stock can never be sold twice.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
