package com.sweetshop.backend.review.dto;

import com.sweetshop.backend.review.Review;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long userId;
    private String userName;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;

    public static ReviewResponse from(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getFullName(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
