package com.sweetshop.backend.review.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class ReviewSummaryResponse {
    private List<ReviewResponse> reviews;
    private double averageRating;
    private long reviewCount;

    public static ReviewSummaryResponse from(List<ReviewResponse> reviews) {
        double average = reviews.stream()
                .mapToInt(ReviewResponse::getRating)
                .average()
                .orElse(0.0);

        return new ReviewSummaryResponse(reviews, Math.round(average * 10) / 10.0, reviews.size());
    }
}
