package com.sweetshop.backend.cart;

import com.sweetshop.backend.cart.dto.AddCartItemRequest;
import com.sweetshop.backend.cart.dto.CartItemResponse;
import com.sweetshop.backend.cart.dto.CartResponse;
import com.sweetshop.backend.cart.dto.UpdateCartItemRequest;
import com.sweetshop.backend.product.Product;
import com.sweetshop.backend.product.ProductRepository;
import com.sweetshop.backend.user.User;
import com.sweetshop.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartService(
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository) {
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    public CartResponse getCart(Long userId) {
        var items = cartItemRepository.findByUserId(userId).stream()
                .map(CartItemResponse::from)
                .toList();
        return CartResponse.from(items);
    }

    public CartResponse addItem(Long userId, AddCartItemRequest request) {
        Product product = findAvailableProduct(request.getProductId());

        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, request.getProductId())
                .orElseGet(() -> CartItem.builder()
                        .user(userRepository.getReferenceById(userId))
                        .product(product)
                        .quantity(0)
                        .build());

        int newQuantity = cartItem.getQuantity() + request.getQuantity();
        ensureStockAvailable(product, newQuantity);
        cartItem.setQuantity(newQuantity);

        cartItemRepository.save(cartItem);
        return getCart(userId);
    }

    public CartResponse updateItem(Long userId, Long productId, UpdateCartItemRequest request) {
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found in cart"));

        ensureStockAvailable(cartItem.getProduct(), request.getQuantity());
        cartItem.setQuantity(request.getQuantity());

        cartItemRepository.save(cartItem);
        return getCart(userId);
    }

    public CartResponse removeItem(Long userId, Long productId) {
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found in cart"));

        cartItemRepository.delete(cartItem);
        return getCart(userId);
    }

    @Transactional
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
    }

    private Product findAvailableProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (!Boolean.TRUE.equals(product.getIsAvailable())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Product is not currently available");
        }

        return product;
    }

    private void ensureStockAvailable(Product product, int requestedQuantity) {
        if (requestedQuantity > product.getStockQuantity()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only " + product.getStockQuantity() + " of " + product.getName() + " left in stock"
            );
        }
    }
}
