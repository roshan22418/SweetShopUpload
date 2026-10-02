package com.sweetshop.backend.product.dto;

import com.sweetshop.backend.product.Product;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String name;
    private String description;
    private BigDecimal price;
    private String unit;
    private Integer stockQuantity;
    private String imageUrl;
    private Boolean isAvailable;

    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getUnit(),
                product.getStockQuantity(),
                product.getImageUrl(),
                product.getIsAvailable()
        );
    }
}
