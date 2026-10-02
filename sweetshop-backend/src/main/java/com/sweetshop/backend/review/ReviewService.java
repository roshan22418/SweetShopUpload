package com.sweetshop.backend.review;

import com.sweetshop.backend.order.OrderItemRepository;
import com.sweetshop.backend.product.Product;
import com.sweetshop.backend.product.ProductRepository;
import com.sweetshop.backend.review.dto.ReviewRequest;
import com.sweetshop.backend.review.dto.ReviewResponse;
import com.sweetshop.backend.review.dto.ReviewSummaryResponse;
import com.sweetshop.backend.user.User;
import com.sweetshop.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderItemRepository orderItemRepository;

    public ReviewService(
            ReviewRepository reviewRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            OrderItemRepository orderItemRepository) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.orderItemRepository = orderItemRepository;
    }

    public ReviewSummaryResponse getReviewsForProduct(Long productId) {
        var reviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
                .map(ReviewResponse::from)
                .toList();
        return ReviewSummaryResponse.from(reviews);
    }

    public ReviewResponse upsertReview(Long userId, Long productId, ReviewRequest request) {
        if (!productRepository.existsById(productId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }

        if (!orderItemRepository.existsByOrder_User_IdAndProduct_Id(userId, productId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only review products you have ordered");
        }

        Review review = reviewRepository.findByUserIdAndProductId(userId, productId)
                .orElseGet(() -> {
                    User user = userRepository.getReferenceById(userId);
                    Product product = productRepository.getReferenceById(productId);
                    return Review.builder().user(user).product(product).build();
                });

        review.setRating(request.getRating());
        review.setComment(request.getComment());

        return ReviewResponse.from(reviewRepository.save(review));
    }

    public void deleteOwnReview(Long userId, Long productId) {
        Review review = reviewRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        reviewRepository.delete(review);
    }

    public void deleteById(Long reviewId) {
        if (!reviewRepository.existsById(reviewId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found");
        }
        reviewRepository.deleteById(reviewId);
    }
}
