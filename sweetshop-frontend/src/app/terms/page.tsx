export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-amber-900">Terms &amp; Conditions</h1>
      <p className="mb-6 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        This is a starting template — please review and adjust it to match how your shop actually operates
        before relying on it. It isn&apos;t legal advice.
      </p>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">1. About these terms</h2>
          <p>
            By placing an order through this website, you agree to the terms below. If you don&apos;t agree
            with any part, please don&apos;t place an order and contact us instead.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">2. Orders</h2>
          <p>
            All orders are subject to product availability and stock at the time of purchase. Prices shown
            are in Indian Rupees (₹) and include applicable taxes unless stated otherwise. We reserve the
            right to refuse or cancel an order at our discretion — for example, if an item goes out of
            stock after you&apos;ve ordered it.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">3. Payment</h2>
          <p>
            You can pay online (cards, UPI, netbanking, wallets, via Razorpay) or at the counter/on delivery,
            depending on what&apos;s offered at checkout. Online payments are processed securely by Razorpay —
            we never see or store your card or bank details.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">4. Fulfillment</h2>
          <p>
            Orders can be placed for dine-in, takeaway, or delivery. Delivery times and areas may vary —
            we&apos;ll contact you using the phone number provided at checkout if there&apos;s any issue with
            your order.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">5. Changes</h2>
          <p>We may update these terms from time to time. Continuing to use the site means you accept the current version.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900">6. Contact</h2>
          <p>
            Questions about these terms? See our <a href="/contact" className="text-amber-700 underline">Contact Us</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
