package com.sweetshop.backend.notification;

import com.sweetshop.backend.order.FulfillmentType;
import com.sweetshop.backend.order.Order;
import com.sweetshop.backend.order.OrderItem;
import com.sweetshop.backend.order.PaymentMethod;

/** Builds the WhatsApp text for a new order. WhatsApp renders *bold* and keeps line breaks. */
public final class OrderMessageFormatter {

    private OrderMessageFormatter() {}

    public static String newOrder(Order order) {
        StringBuilder sb = new StringBuilder();
        sb.append("🛎️ *New order #").append(order.getId()).append("*\n\n");

        sb.append("*Customer:* ").append(order.getUser().getFullName()).append('\n');
        sb.append("*Phone:* ").append(order.getContactPhone()).append('\n');
        sb.append("*Type:* ").append(label(order.getFulfillmentType())).append('\n');
        if (order.getFulfillmentType() == FulfillmentType.DELIVERY && order.getDeliveryAddress() != null) {
            sb.append("*Address:* ").append(order.getDeliveryAddress()).append('\n');
        }

        sb.append("\n*Items:*\n");
        for (OrderItem item : order.getItems()) {
            sb.append("• ").append(item.getQuantity()).append(" x ").append(item.getProductName())
                    .append(" — ₹").append(item.getSubtotal().toPlainString()).append('\n');
        }

        sb.append("\n*Total:* ₹").append(order.getTotalAmount().toPlainString()).append('\n');
        sb.append("*Payment:* ").append(order.getPaymentMethod() == PaymentMethod.RAZORPAY
                ? "Paid online ✅" : "Pay at counter / on delivery");
        return sb.toString();
    }

    public static String cancelledByCustomer(Order order) {
        return "❌ *Order #" + order.getId() + " cancelled by the customer*\n\n"
                + "*Customer:* " + order.getUser().getFullName() + '\n'
                + "*Phone:* " + order.getContactPhone() + '\n'
                + "*Total:* ₹" + order.getTotalAmount().toPlainString() + "\n\n"
                + "No need to prepare it — the stock has been put back.";
    }

    private static String label(FulfillmentType type) {
        return switch (type) {
            case DINE_IN -> "Dine in";
            case TAKEAWAY -> "Takeaway";
            case DELIVERY -> "Delivery";
        };
    }
}
