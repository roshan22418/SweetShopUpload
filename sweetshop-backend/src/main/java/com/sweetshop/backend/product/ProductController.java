package com.sweetshop.backend.product;

import com.sweetshop.backend.product.dto.ImageUploadResponse;
import com.sweetshop.backend.product.dto.ProductRequest;
import com.sweetshop.backend.product.dto.ProductResponse;
import com.sweetshop.backend.user.Role;
import com.sweetshop.backend.user.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final FileStorageService fileStorageService;

    public ProductController(ProductService productService, FileStorageService fileStorageService) {
        this.productService = productService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public List<ProductResponse> getAll(
            @RequestParam(required = false) Long categoryId,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean includeHidden = isAdmin(principal);
        return categoryId != null
                ? productService.getByCategory(categoryId, includeHidden)
                : productService.getAll(includeHidden);
    }

    @GetMapping("/{id}")
    public ProductResponse getById(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return productService.getById(id, isAdmin(principal));
    }

    private boolean isAdmin(UserPrincipal principal) {
        return principal != null && principal.getUser().getRole() == Role.ADMIN;
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(request));
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse uploadImage(@RequestParam("file") MultipartFile file) {
        return new ImageUploadResponse(fileStorageService.store(file));
    }
}
