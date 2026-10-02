package com.sweetshop.backend.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Sends a WhatsApp message to the shop owner through CallMeBot's free personal-use API
 * (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
 *
 * Deliberately never throws: a WhatsApp hiccup must not affect the customer's order. When the
 * phone / api key aren't configured it does nothing, so the feature is opt-in.
 */
@Service
public class WhatsAppNotifier {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppNotifier.class);

    private final String baseUrl;
    private final String phone;
    private final String apiKey;
    private final RestClient restClient;

    public WhatsAppNotifier(
            @Value("${whatsapp.callmebot.url}") String baseUrl,
            @Value("${whatsapp.callmebot.phone}") String phone,
            @Value("${whatsapp.callmebot.api-key}") String apiKey) {
        this.baseUrl = baseUrl;
        this.phone = phone;
        this.apiKey = apiKey;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(phone) && StringUtils.hasText(apiKey);
    }

    public void send(String text) {
        if (!isConfigured()) {
            log.debug("WhatsApp notification skipped: CALLMEBOT_PHONE / CALLMEBOT_API_KEY not set");
            return;
        }

        try {
            // URI variables are fully percent-encoded by RestClient (so '+' in the phone, '&', newlines
            // and emoji in the text all survive); the key is never logged.
            String body = restClient.get()
                    .uri(baseUrl + "?phone={phone}&text={text}&apikey={apikey}", phone.trim(), text, apiKey.trim())
                    .retrieve()
                    .body(String.class);
            log.info("WhatsApp notification sent (CallMeBot responded: {})", abbreviate(body));
        } catch (Exception e) {
            log.warn("WhatsApp notification failed: {}", e.getMessage());
        }
    }

    private static String abbreviate(String s) {
        if (s == null) return "empty";
        String oneLine = s.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        return oneLine.length() > 120 ? oneLine.substring(0, 120) + "..." : oneLine;
    }
}
