package com.sweetshop.backend.category;

import com.sweetshop.backend.category.dto.CategoryRequest;
import com.sweetshop.backend.category.dto.CategoryResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<CategoryResponse> getAll() {
        return categoryRepository.findAll().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    public CategoryResponse getById(Long id) {
        return CategoryResponse.from(findEntityById(id));
    }

    public CategoryResponse create(CategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A category with this name already exists");
        }

        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();

        return CategoryResponse.from(categoryRepository.save(category));
    }

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findEntityById(id);

        if (!category.getName().equals(request.getName()) && categoryRepository.existsByName(request.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A category with this name already exists");
        }

        category.setName(request.getName());
        category.setDescription(request.getDescription());

        return CategoryResponse.from(categoryRepository.save(category));
    }

    public void delete(Long id) {
        Category category = findEntityById(id);
        try {
            categoryRepository.delete(category);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete \"" + category.getName() + "\" because it still has products in it.");
        }
    }

    Category findEntityById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }
}
