ALTER TABLE orders
    ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'COD',
    ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN razorpay_order_id VARCHAR(100),
    ADD COLUMN razorpay_payment_id VARCHAR(100);
