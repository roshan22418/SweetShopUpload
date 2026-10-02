package com.sweetshop.backend.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ProductRequest {

    @NotNull(message = "Category is required")
    private Long categoryId;

    @NotBlank(message = "Name is required")
    @Size(max = 150, message = "Name must be at most 150 characters")
    private String name;

    @Size(max = 1000, message = "Description must be at most 1000 characters")
    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Price must not be negative")
    private BigDecimal price;

    @NotBlank(message = "Unit is required, e.g. '500g', '1 piece'")
    @Size(max = 30, message = "Unit must be at most 30 characters")
    private String unit;

    @NotNull(message = "Stock quantity is required")
    @Min(value = 0, message = "Stock quantity must not be negative")
    private Integer stockQuantity;

    private String imageUrl;

    private Boolean isAvailable;
}
