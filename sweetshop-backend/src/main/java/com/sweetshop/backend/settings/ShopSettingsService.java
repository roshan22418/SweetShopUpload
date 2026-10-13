package com.sweetshop.backend.settings;

import com.sweetshop.backend.payment.RazorpayService;
import com.sweetshop.backend.settings.dto.ShopSettingsRequest;
import com.sweetshop.backend.settings.dto.ShopSettingsResponse;
import org.springframework.stereotype.Service;

@Service
public class ShopSettingsService {

    private final ShopSettingsRepository shopSettingsRepository;
    private final RazorpayService razorpayService;

    public ShopSettingsService(ShopSettingsRepository shopSettingsRepository, RazorpayService razorpayService) {
        this.shopSettingsRepository = shopSettingsRepository;
        this.razorpayService = razorpayService;
    }

    public ShopSettingsResponse getSettings() {
        return ShopSettingsResponse.from(findSettings(), razorpayService.isConfigured());
    }

    public ShopSettingsResponse updateSettings(ShopSettingsRequest request) {
        ShopSettings settings = findSettings();
        settings.setShopName(request.getShopName());
        settings.setDescription(request.getDescription());
        settings.setContactPhone(request.getContactPhone());
        settings.setAddress(request.getAddress());
        settings.setEmail(request.getEmail());
        return ShopSettingsResponse.from(shopSettingsRepository.save(settings), razorpayService.isConfigured());
    }

    private ShopSettings findSettings() {
        return shopSettingsRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException("shop_settings has not been seeded"));
    }
}
