export default function PrivacyPage() {
  return (
    <div className="card mx-auto max-w-2xl md:p-8">
      <h1 className="page-title mb-3">Privacy Policy</h1>
      <p className="mb-6 rounded-md bg-gold-light/40 px-3 py-2 text-xs text-ink">
        This is a starting template — please review and adjust it to match what data you actually collect
        and how you use it before relying on it. It isn&apos;t legal advice.
      </p>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-charcoal/80">
        <section>
          <h2 className="mb-1 font-display text-lg font-medium text-ink">1. What we collect</h2>
          <p>
            When you create an account or place an order, we collect your name, email address, phone
            number, and (for delivery orders) your delivery address. If you pay online, payment is handled
            entirely by Razorpay — we never receive or store your card or bank account details.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-lg font-medium text-ink">2. How we use it</h2>
          <p>
            We use your details to process and fulfill your orders, contact you about order updates, and
            improve the shop&apos;s offerings. We don&apos;t sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-lg font-medium text-ink">3. Who we share it with</h2>
          <p>
            Payment details are shared only with Razorpay to process transactions. We don&apos;t share your
            information with anyone else except where required by law.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-lg font-medium text-ink">4. Your account</h2>
          <p>
            You can view and update your name and phone number, and change your password, anytime from
            your Profile page. To request deletion of your account or data, use the Contact Us page.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-lg font-medium text-ink">5. Contact</h2>
          <p>
            Questions about this policy? See our <a href="/contact" className="font-medium text-plum underline">Contact Us</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
