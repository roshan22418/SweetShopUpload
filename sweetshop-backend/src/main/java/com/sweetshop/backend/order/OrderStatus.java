package com.sweetshop.backend.order;

public enum OrderStatus {
    PENDING,
    CONFIRMED,
    COMPLETED,
    CANCELLED;

    /**
     * Fulfilment only moves forward. COMPLETED and CANCELLED are final: cancelling puts the stock back,
     * so "un-cancelling" would sell stock that may already be gone.
     */
    public boolean canTransitionTo(OrderStatus next) {
        return switch (this) {
            case PENDING -> next != PENDING;
            case CONFIRMED -> next == COMPLETED || next == CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }

    public boolean isFinal() {
        return this == COMPLETED || this == CANCELLED;
    }
}
