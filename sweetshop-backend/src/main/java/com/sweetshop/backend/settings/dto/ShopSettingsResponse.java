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
    // Not stored: true when Razorpay keys are configured, so the checkout only offers payments that can work.
    private boolean onlinePaymentEnabled;

    public static ShopSettingsResponse from(ShopSettings settings, boolean onlinePaymentEnabled) {
        return new ShopSettingsResponse(
                settings.getShopName(),
                settings.getDescription(),
                settings.getContactPhone(),
                settings.getAddress(),
                settings.getEmail(),
                onlinePaymentEnabled);
    }
}
