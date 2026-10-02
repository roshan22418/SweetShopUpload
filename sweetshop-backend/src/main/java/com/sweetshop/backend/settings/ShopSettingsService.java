package com.sweetshop.backend.settings;

import com.sweetshop.backend.settings.dto.ShopSettingsRequest;
import com.sweetshop.backend.settings.dto.ShopSettingsResponse;
import org.springframework.stereotype.Service;

@Service
public class ShopSettingsService {

    private final ShopSettingsRepository shopSettingsRepository;

    public ShopSettingsService(ShopSettingsRepository shopSettingsRepository) {
        this.shopSettingsRepository = shopSettingsRepository;
    }

    public ShopSettingsResponse getSettings() {
        return ShopSettingsResponse.from(findSettings());
    }

    public ShopSettingsResponse updateSettings(ShopSettingsRequest request) {
        ShopSettings settings = findSettings();
        settings.setShopName(request.getShopName());
        settings.setDescription(request.getDescription());
        settings.setContactPhone(request.getContactPhone());
        settings.setAddress(request.getAddress());
        settings.setEmail(request.getEmail());
        return ShopSettingsResponse.from(shopSettingsRepository.save(settings));
    }

    private ShopSettings findSettings() {
        return shopSettingsRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException("shop_settings has not been seeded"));
    }
}
