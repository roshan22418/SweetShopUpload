package com.sweetshop.backend.notification;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class OrderNotificationListener {

    private final WhatsAppNotifier whatsAppNotifier;

    public OrderNotificationListener(WhatsAppNotifier whatsAppNotifier) {
        this.whatsAppNotifier = whatsAppNotifier;
    }

    // AFTER_COMMIT: nothing is sent for an order that rolled back (e.g. out-of-stock mid-checkout).
    // @Async: the customer's checkout response never waits on WhatsApp.
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        whatsAppNotifier.send(event.message());
    }
}
