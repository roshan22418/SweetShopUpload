package com.sweetshop.backend.review;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
public class ReviewModerationController {

    private final ReviewService reviewService;

    public ReviewModerationController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteAnyReview(@PathVariable Long reviewId) {
        reviewService.deleteById(reviewId);
        return ResponseEntity.noContent().build();
    }
}
