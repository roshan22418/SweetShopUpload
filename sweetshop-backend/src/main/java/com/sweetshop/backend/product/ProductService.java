package com.sweetshop.backend.product;

import com.sweetshop.backend.category.Category;
import com.sweetshop.backend.category.CategoryRepository;
import com.sweetshop.backend.product.dto.ProductRequest;
import com.sweetshop.backend.product.dto.ProductResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    // "includeHidden" is true only for admin callers — a product an admin has soft-deleted
    // (delete() below, when it has order history) must not be visible to anyone else at all:
    // it stays in the database (order history depends on it), it just never leaves this
    // service for a non-admin caller.
    public List<ProductResponse> getAll(boolean includeHidden) {
        List<Product> products = includeHidden ? productRepository.findAll() : productRepository.findByIsAvailableTrue();
        return products.stream().map(ProductResponse::from).toList();
    }

    public List<ProductResponse> getByCategory(Long categoryId, boolean includeHidden) {
        List<Product> products = includeHidden
                ? productRepository.findByCategoryId(categoryId)
                : productRepository.findByCategoryIdAndIsAvailableTrue(categoryId);
        return products.stream().map(ProductResponse::from).toList();
    }

    public ProductResponse getById(Long id, boolean includeHidden) {
        Product product = findEntityById(id);
        if (!includeHidden && !Boolean.TRUE.equals(product.getIsAvailable())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        return ProductResponse.from(product);
    }

    public ProductResponse create(ProductRequest request) {
        Category category = findCategoryById(request.getCategoryId());

        Product product = Product.builder()
                .category(category)
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .unit(request.getUnit())
                .stockQuantity(request.getStockQuantity())
                .imageUrl(request.getImageUrl())
                .isAvailable(request.getIsAvailable() == null || request.getIsAvailable())
                .build();

        return ProductResponse.from(productRepository.save(product));
    }

    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findEntityById(id);
        Category category = findCategoryById(request.getCategoryId());

        product.setCategory(category);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setUnit(request.getUnit());
        product.setStockQuantity(request.getStockQuantity());
        product.setImageUrl(request.getImageUrl());
        product.setIsAvailable(request.getIsAvailable() == null || request.getIsAvailable());

        return ProductResponse.from(productRepository.save(product));
    }

    public void delete(Long id) {
        Product product = findEntityById(id);
        try {
            productRepository.delete(product);
        } catch (DataIntegrityViolationException e) {
            // Existing orders reference this product (order_items.product_id has no cascade,
            // on purpose — deleting it would corrupt past order history). Soft-delete instead:
            // hide it from the storefront exactly like manually unchecking "Available for sale".
            product.setIsAvailable(false);
            productRepository.save(product);
        }
    }

    private Product findEntityById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private Category findCategoryById(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }
}
