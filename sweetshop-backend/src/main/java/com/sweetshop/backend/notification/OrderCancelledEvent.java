package com.sweetshop.backend.notification;

/** Published when a customer cancels their own order, so the shop knows not to prepare it. */
public record OrderCancelledEvent(Long orderId, String message) {}
