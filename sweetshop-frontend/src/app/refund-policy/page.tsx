export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-amber-900">Refund &amp; Cancellation Policy</h1>
      <p className="mb-6 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        This is a starting template — please review and adjust it to match how you actually want to handle
        cancellations and refunds before relying on it. It isn&apos;t legal advice.
      </p>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">1. Cancellations</h2>
          <p>
            Since our items are freshly prepared, orders can typically only be cancelled shortly after being
            placed and before preparation begins. To cancel, contact us as soon as possible via the order&apos;s
            message thread (on the order details page) or the Contact Us page, quoting your order number.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">2. Refunds for online payments</h2>
          <p>
            If an order paid for online (via Razorpay) is cancelled before preparation, or if we&apos;re unable
            to fulfill it, we&apos;ll refund the full amount to your original payment method. Refunds are
            typically processed within 5–7 business days, depending on your bank/payment provider.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">3. Quality issues</h2>
          <p>
            If something arrives damaged, incorrect, or not as described, please let us know within 24 hours
            with your order number and, if possible, a photo — we&apos;ll make it right with a replacement or
            refund.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">4. Pay-at-counter/on-delivery orders</h2>
          <p>Since no payment has been collected upfront for these orders, cancellation simply means the order won&apos;t be prepared or delivered — no refund is needed.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">5. Contact</h2>
          <p>
            For any cancellation or refund request, see our <a href="/contact" className="text-amber-700 underline">Contact Us</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
