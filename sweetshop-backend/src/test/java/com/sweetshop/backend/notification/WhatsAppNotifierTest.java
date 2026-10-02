package com.sweetshop.backend.notification;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WhatsAppNotifierTest {

    private HttpServer server;
    private final AtomicInteger hits = new AtomicInteger();
    private final AtomicReference<String> rawQuery = new AtomicReference<>();
    private volatile int responseCode = 200;
    private String url;

    @BeforeEach
    void startStub() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/whatsapp.php", exchange -> {
            hits.incrementAndGet();
            rawQuery.set(exchange.getRequestURI().getRawQuery());
            byte[] body = "<p>Message queued</p>".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(responseCode, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        url = "http://127.0.0.1:" + server.getAddress().getPort() + "/whatsapp.php";
    }

    @AfterEach
    void stopStub() {
        server.stop(0);
    }

    private static Map<String, String> decode(String rawQuery) {
        Map<String, String> map = new HashMap<>();
        for (String pair : rawQuery.split("&")) {
            String[] kv = pair.split("=", 2);
            map.put(kv[0], URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
        }
        return map;
    }

    @Test
    void sendsPhoneTextAndKeyWithSpecialCharactersIntact() {
        WhatsAppNotifier notifier = new WhatsAppNotifier(url, "+919876543210", "secret-key");
        String text = "🛎️ *New order #5*\nCustomer: A & B\n• 2 x Cake — ₹1200.00 (50% off)";

        notifier.send(text);

        assertEquals(1, hits.get());
        // the raw query must not contain an unencoded '+' / '&' inside values or a literal newline
        assertFalse(rawQuery.get().contains("\n"));
        Map<String, String> q = decode(rawQuery.get());
        assertEquals("+919876543210", q.get("phone"));
        assertEquals("secret-key", q.get("apikey"));
        assertEquals(text, q.get("text"));
        assertEquals(3, q.size(), "'&' inside the text must not create extra parameters");
    }

    @Test
    void doesNothingWhenNotConfigured() {
        WhatsAppNotifier blankKey = new WhatsAppNotifier(url, "+919876543210", "");
        WhatsAppNotifier blankPhone = new WhatsAppNotifier(url, "", "k");

        assertFalse(blankKey.isConfigured());
        assertFalse(blankPhone.isConfigured());
        blankKey.send("hi");
        blankPhone.send("hi");

        assertEquals(0, hits.get());
    }

    @Test
    void neverThrowsWhenCallMeBotReturnsAnError() {
        responseCode = 500;
        WhatsAppNotifier notifier = new WhatsAppNotifier(url, "+919876543210", "k");

        assertDoesNotThrow(() -> notifier.send("hi"));
        assertEquals(1, hits.get());
    }

    @Test
    void neverThrowsWhenServerIsUnreachable() {
        server.stop(0);
        WhatsAppNotifier notifier = new WhatsAppNotifier(url, "+919876543210", "k");

        assertTrue(notifier.isConfigured());
        assertDoesNotThrow(() -> notifier.send("hi"));
    }
}
