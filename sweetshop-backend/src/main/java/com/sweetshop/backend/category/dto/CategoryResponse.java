package com.sweetshop.backend.category.dto;

import com.sweetshop.backend.category.Category;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CategoryResponse {
    private Long id;
    private String name;
    private String description;

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getDescription());
    }
}
