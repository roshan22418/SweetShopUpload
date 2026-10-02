package com.sweetshop.backend.product;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CloudinaryUploaderTest {

    private HttpServer server;
    private final AtomicReference<String> requestPath = new AtomicReference<>();
    private final AtomicReference<String> requestBody = new AtomicReference<>();
    private volatile int responseCode = 200;
    private volatile String responseBody = "{\"secure_url\":\"https://res.cloudinary.com/democloud/image/upload/v1/sweetshop/products/abc.jpg\"}";
    private String base;

    @BeforeEach
    void startStub() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requestPath.set(exchange.getRequestURI().getPath());
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1));
            byte[] out = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(responseCode, out.length);
            exchange.getResponseBody().write(out);
            exchange.close();
        });
        server.start();
        base = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void stopStub() {
        server.stop(0);
    }

    private CloudinaryUploader uploader(String cloud, String key, String secret) {
        return new CloudinaryUploader(cloud, key, secret, "sweetshop/products", base);
    }

    private static String field(String multipartBody, String name) {
        // Spring adds a "Content-Type: text/plain" header line to each text part, hence the optional header lines
        Matcher m = Pattern.compile("name=\"" + name + "\"(?:\\r\\n[^\\r\\n]+)*\\r\\n\\r\\n([^\\r]*)\\r\\n").matcher(multipartBody);
        return m.find() ? m.group(1) : null;
    }

    @Test
    void signatureMatchesCloudinarysOwnDocumentedExample() {
        // From Cloudinary's docs: "timestamp=1315060510" + secret "abcd" -> SHA-1 a21ad0f6...
        assertEquals("a21ad0f63beb4de2e5575204b79ab90bffb02c10",
                CloudinaryUploader.sign(Map.of("timestamp", "1315060510"), "abcd"));
    }

    @Test
    void signatureSortsParametersAlphabetically() {
        // order of insertion must not matter: folder < timestamp
        assertEquals(
                CloudinaryUploader.sign(new java.util.LinkedHashMap<>(Map.of("folder", "f", "timestamp", "1")), "s"),
                CloudinaryUploader.sign(new java.util.LinkedHashMap<>(Map.of("timestamp", "1", "folder", "f")), "s"));
    }

    @Test
    void uploadsSignedMultipartAndReturnsSecureUrl() {
        String url = uploader("democloud", "key123", "topsecret").upload("IMAGE-BYTES".getBytes(), "pic.jpg");

        assertEquals("https://res.cloudinary.com/democloud/image/upload/v1/sweetshop/products/abc.jpg", url);
        assertEquals("/v1_1/democloud/image/upload", requestPath.get());

        String body = requestBody.get();
        String timestamp = field(body, "timestamp");
        assertEquals("key123", field(body, "api_key"));
        assertEquals("sweetshop/products", field(body, "folder"));
        assertTrue(body.contains("filename=\"pic.jpg\""));
        assertTrue(body.contains("IMAGE-BYTES"));
        // the signature the stub received must be exactly what Cloudinary would compute for those params
        assertEquals(CloudinaryUploader.sign(Map.of("folder", "sweetshop/products", "timestamp", timestamp), "topsecret"),
                field(body, "signature"));
        // the secret itself must never be sent
        assertFalse(body.contains("topsecret"));
    }

    @Test
    void notConfiguredWhenAnyCredentialIsBlank() {
        assertFalse(uploader("", "k", "s").isConfigured());
        assertFalse(uploader("c", "", "s").isConfigured());
        assertFalse(uploader("c", "k", "").isConfigured());
        assertTrue(uploader("c", "k", "s").isConfigured());
    }

    @Test
    void upstreamErrorBecomesBadGatewayWithoutLeakingDetails() {
        responseCode = 401;
        responseBody = "{\"error\":{\"message\":\"Invalid api_key key123 for cloud democloud\"}}";

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> uploader("democloud", "key123", "s").upload(new byte[]{1}, "a.jpg"));

        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
        assertFalse(String.valueOf(ex.getReason()).contains("key123"));
    }

    @Test
    void responseWithoutUrlIsBadGateway() {
        responseBody = "{\"public_id\":\"x\"}";
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> uploader("c", "k", "s").upload(new byte[]{1}, "a.jpg"));
        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
    }

    @Test
    void storeUsesCloudinaryWhenConfigured(@TempDir Path dir) {
        FileStorageService service = new FileStorageService(dir.toString(), uploader("democloud", "k", "s"));
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", "bytes".getBytes());

        String url = service.store(file);

        assertTrue(url.startsWith("https://res.cloudinary.com/"));
        assertEquals(0, dir.toFile().list().length, "nothing should be written to local disk");
    }

    @Test
    void storeFallsBackToLocalDiskWhenNotConfigured(@TempDir Path dir) throws Exception {
        FileStorageService service = new FileStorageService(dir.toString(), uploader("", "", ""));
        MockMultipartFile file = new MockMultipartFile("file", "x.png", "image/png", "bytes".getBytes());

        String url = service.store(file);

        assertTrue(url.matches("/uploads/products/[0-9a-f-]{36}\\.png"), url);
        assertTrue(Files.exists(dir.resolve(url.substring("/uploads/products/".length()))));
        assertEquals(0, requestPath.get() == null ? 0 : 1, "Cloudinary must not be called");
    }

    @Test
    void storeStillRejectsNonImages(@TempDir Path dir) {
        FileStorageService service = new FileStorageService(dir.toString(), uploader("c", "k", "s"));
        MockMultipartFile file = new MockMultipartFile("file", "x.exe", "application/octet-stream", "bytes".getBytes());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.store(file));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals(null, requestPath.get(), "rejected before any upload");
    }
}
