package com.sweetshop.backend.notification;

/** Published by OrderService inside the checkout transaction; the message is pre-built so no lazy loading is needed later. */
public record OrderPlacedEvent(Long orderId, String message) {}
