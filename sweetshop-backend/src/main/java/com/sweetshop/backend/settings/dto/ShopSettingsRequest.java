package com.sweetshop.backend.settings.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShopSettingsRequest {

    @NotBlank(message = "Shop name is required")
    @Size(max = 150, message = "Shop name must be at most 150 characters")
    private String shopName;

    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    @Size(max = 20, message = "Contact phone must be at most 20 characters")
    private String contactPhone;

    @Size(max = 500, message = "Address must be at most 500 characters")
    private String address;

    @Email(message = "Must be a valid email address")
    @Size(max = 255, message = "Email must be at most 255 characters")
    private String email;
}
