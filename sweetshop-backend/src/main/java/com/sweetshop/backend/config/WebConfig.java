package com.sweetshop.backend.config;

import com.sweetshop.backend.product.FileStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final FileStorageService fileStorageService;

    public WebConfig(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // app.upload.dir already points at the products subfolder, so the URL prefix
        // must match it exactly (avoids a doubled ".../products/products/..." path).
        registry.addResourceHandler("/uploads/products/**")
                .addResourceLocations("file:" + fileStorageService.getUploadRoot() + "/");
    }
}
