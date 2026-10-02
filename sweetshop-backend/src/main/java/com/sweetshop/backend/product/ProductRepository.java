package com.sweetshop.backend.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategoryId(Long categoryId);

    List<Product> findByIsAvailableTrue();

    List<Product> findByCategoryIdAndIsAvailableTrue(Long categoryId);
}
