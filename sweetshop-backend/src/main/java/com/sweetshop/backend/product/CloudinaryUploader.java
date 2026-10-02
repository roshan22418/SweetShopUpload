package com.sweetshop.backend.product;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;

/**
 * Stores product images on Cloudinary (free tier) via its signed-upload REST API — no SDK needed.
 * Needed on hosts with an ephemeral disk (Render's free plan wipes local files on every deploy).
 * Opt-in: with the three CLOUDINARY_* values blank, FileStorageService keeps using the local disk.
 */
@Service
public class CloudinaryUploader {

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final String folder;
    private final String apiBase;
    private final RestClient restClient;

    public CloudinaryUploader(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}") String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret,
            @Value("${cloudinary.folder}") String folder,
            @Value("${cloudinary.api-base}") String apiBase) {
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.folder = folder;
        this.apiBase = apiBase;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(cloudName) && StringUtils.hasText(apiKey) && StringUtils.hasText(apiSecret);
    }

    /** Uploads the image and returns its permanent HTTPS URL. */
    public String upload(byte[] bytes, String filename) {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);

        Map<String, String> signedParams = new TreeMap<>();
        signedParams.put("folder", folder);
        signedParams.put("timestamp", timestamp);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        body.add("api_key", apiKey.trim());
        body.add("folder", folder);
        body.add("timestamp", timestamp);
        body.add("signature", sign(signedParams, apiSecret.trim()));

        Map<?, ?> response;
        try {
            response = restClient.post()
                    .uri(apiBase + "/v1_1/{cloud}/image/upload", cloudName.trim())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            // never echo the upstream message: it can include account details
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Image upload failed, please try again");
        }

        Object url = response == null ? null : response.get("secure_url");
        if (url == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Image upload failed, please try again");
        }
        return url.toString();
    }

    /**
     * Cloudinary's signature: SHA-1 (hex) of "k1=v1&k2=v2" — the signed params sorted by name — with the
     * API secret appended directly. file, api_key, cloud_name and resource_type are never signed.
     */
    static String sign(Map<String, String> params, String secret) {
        StringBuilder toSign = new StringBuilder();
        new TreeMap<>(params).forEach((k, v) -> {
            if (toSign.length() > 0) toSign.append('&');
            toSign.append(k).append('=').append(v);
        });
        toSign.append(secret);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-1").digest(toSign.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-1 not available", e);
        }
    }
}
