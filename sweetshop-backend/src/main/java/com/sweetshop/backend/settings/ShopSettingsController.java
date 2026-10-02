package com.sweetshop.backend.settings;

import com.sweetshop.backend.settings.dto.ShopSettingsRequest;
import com.sweetshop.backend.settings.dto.ShopSettingsResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shop-settings")
public class ShopSettingsController {

    private final ShopSettingsService shopSettingsService;

    public ShopSettingsController(ShopSettingsService shopSettingsService) {
        this.shopSettingsService = shopSettingsService;
    }

    @GetMapping
    public ShopSettingsResponse getSettings() {
        return shopSettingsService.getSettings();
    }

    @PutMapping
    public ShopSettingsResponse updateSettings(@Valid @RequestBody ShopSettingsRequest request) {
        return shopSettingsService.updateSettings(request);
    }
}
