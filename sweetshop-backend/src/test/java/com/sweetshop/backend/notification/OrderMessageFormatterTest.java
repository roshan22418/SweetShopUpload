package com.sweetshop.backend.notification;

import com.sweetshop.backend.order.FulfillmentType;
import com.sweetshop.backend.order.Order;
import com.sweetshop.backend.order.OrderItem;
import com.sweetshop.backend.order.PaymentMethod;
import com.sweetshop.backend.user.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderMessageFormatterTest {

    private Order order(FulfillmentType type, String address, PaymentMethod payment) {
        Order order = Order.builder()
                .id(42L)
                .user(User.builder().fullName("Asha Rao").build())
                .fulfillmentType(type)
                .contactPhone("9876543210")
                .deliveryAddress(address)
                .totalAmount(new BigDecimal("1550.00"))
                .paymentMethod(payment)
                .build();
        order.addItem(OrderItem.builder().productName("Chocolate Cake").quantity(1)
                .unitPrice(new BigDecimal("1200.00")).subtotal(new BigDecimal("1200.00")).build());
        order.addItem(OrderItem.builder().productName("Samosa").quantity(7)
                .unitPrice(new BigDecimal("50.00")).subtotal(new BigDecimal("350.00")).build());
        return order;
    }

    @Test
    void deliveryOrderIncludesEverythingTheShopNeeds() {
        String msg = OrderMessageFormatter.newOrder(order(FulfillmentType.DELIVERY, "12 MG Road, Pune", PaymentMethod.COD));

        assertTrue(msg.contains("#42"));
        assertTrue(msg.contains("Asha Rao"));
        assertTrue(msg.contains("9876543210"));
        assertTrue(msg.contains("Delivery"));
        assertTrue(msg.contains("12 MG Road, Pune"));
        assertTrue(msg.contains("1 x Chocolate Cake — ₹1200.00"));
        assertTrue(msg.contains("7 x Samosa — ₹350.00"));
        assertTrue(msg.contains("*Total:* ₹1550.00"));
        assertTrue(msg.contains("Pay at counter / on delivery"));
    }

    @Test
    void nonDeliveryOrderHasNoAddressLine() {
        String msg = OrderMessageFormatter.newOrder(order(FulfillmentType.TAKEAWAY, null, PaymentMethod.RAZORPAY));

        assertFalse(msg.contains("Address"));
        assertTrue(msg.contains("Takeaway"));
        assertTrue(msg.contains("Paid online"));
    }
}
