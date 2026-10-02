package com.sweetshop.backend.review;

import com.sweetshop.backend.review.dto.ReviewRequest;
import com.sweetshop.backend.review.dto.ReviewResponse;
import com.sweetshop.backend.review.dto.ReviewSummaryResponse;
import com.sweetshop.backend.user.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ReviewSummaryResponse getReviews(@PathVariable Long productId) {
        return reviewService.getReviewsForProduct(productId);
    }

    @PostMapping
    public ReviewResponse upsertReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long productId,
            @Valid @RequestBody ReviewRequest request) {
        return reviewService.upsertReview(principal.getId(), productId, request);
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteOwnReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long productId) {
        reviewService.deleteOwnReview(principal.getId(), productId);
        return ResponseEntity.noContent().build();
    }
}
