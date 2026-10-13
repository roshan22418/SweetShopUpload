package com.sweetshop.backend.settings;

import com.sweetshop.backend.IntegrationTestSupport;
import com.sweetshop.backend.payment.RazorpayService;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import static org.assertj.core.api.Assertions.assertThat;

class ShopSettingsIntegrationTest extends IntegrationTestSupport {

    @Test
    void publicSettingsSayWhetherOnlinePaymentCanWork() throws Exception {
        JsonNode settings = body(getAs(null, "/api/shop-settings"));

        assertThat(settings.get("shopName").asString()).isNotBlank();
        // the integration context configures Razorpay keys (see IntegrationTestSupport)
        assertThat(settings.get("onlinePaymentEnabled").asBoolean()).isTrue();
    }

    @Test
    void onlinePaymentIsReportedOffWithoutKeys() {
        assertThat(new RazorpayService("", "", "http://unused").isConfigured()).isFalse();
        assertThat(new RazorpayService("rzp_test_x", " ", "http://unused").isConfigured()).isFalse();
    }
}
