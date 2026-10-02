package com.sweetshop.backend.message.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderMessageRequest {

    @NotBlank(message = "Message is required")
    @Size(max = 1000, message = "Message must be at most 1000 characters")
    private String message;
}
