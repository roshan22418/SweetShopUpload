package com.sweetshop.backend.settings.dto;

import com.sweetshop.backend.settings.ShopSettings;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ShopSettingsResponse {
    private String shopName;
    private String description;
    private String contactPhone;
    private String address;
    private String email;

    public static ShopSettingsResponse from(ShopSettings settings) {
        return new ShopSettingsResponse(
                settings.getShopName(),
                settings.getDescription(),
                settings.getContactPhone(),
                settings.getAddress(),
                settings.getEmail());
    }
}
