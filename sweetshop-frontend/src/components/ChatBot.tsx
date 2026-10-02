"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Category, FulfillmentType, Order, Product, UserProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  MAX_QUANTITY,
  detectIntent,
  formatRupees,
  isOrderable,
  isValidAddress,
  normalizePhone,
  parseOrderText,
  parseQuantity,
  searchProducts,
} from "@/lib/chatbot";

// A guided, rule-based ordering assistant: buttons for the main path, plus typed shortcuts
// ("2 samosas", "cart", "checkout"). It only calls the same endpoints the website pages use, so
// auth, stock checks, pricing and the new-order WhatsApp alert all behave exactly as on checkout.
// Orders placed here are always pay-at-counter / on delivery (online payment needs the checkout page).

interface Opt {
  label: string;
  value: string;
}

interface Msg {
  id: number;
  from: "bot" | "user";
  text: string;
  options?: Opt[];
  link?: { label: string; href: string };
}

type Step = "idle" | "quantity" | "address" | "phone" | "confirm";

interface Draft {
  product?: Product;
  qty?: number; // quantity typed together with a search ("2 samosas") while we wait for a product pick
  fulfillment?: FulfillmentType;
  address?: string;
  phone?: string;
}

const MENU_OPTIONS: Opt[] = [
  { label: "🛍️ Order food", value: "order" },
  { label: "🛒 My cart", value: "cart" },
  { label: "📦 My orders", value: "orders" },
  { label: "❓ Help", value: "help" },
];

const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  DINE_IN: "Dine in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

const YES = /^(yes|y|yep|yeah|ok|okay|confirm|sure|place order|place my order|confirm order)$/i;
const NO = /^(no|n|cancel|stop|nope)$/i;

function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Sorry, something went wrong. Please try again.";
}

export default function ChatBot() {
  const { user, loading } = useAuth();
  // Customers only — admins manage orders elsewhere. Keyed by user so a logout/login starts a fresh chat.
  if (loading || !user || user.role === "ADMIN") return null;
  return <ChatPanel key={user.userId} firstName={user.fullName.split(" ")[0]} fullName={user.fullName} />;
}

function ChatPanel({ firstName, fullName }: { firstName: string; fullName: string }) {
  const { refreshCart, incrementItem, getQuantity } = useCart();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      from: "bot",
      text: `Hi ${firstName}! 👋 I'm the order assistant. I can help you order, check your cart, or track your orders. What would you like to do?`,
      options: MENU_OPTIONS,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("idle");

  const nextId = useRef(2);
  const draft = useRef<Draft>({});
  const productsCache = useRef<Product[] | null>(null);
  const profilePhone = useRef<string | null | undefined>(undefined); // undefined = not fetched yet
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  // ---- message helpers ----

  function push(msg: Omit<Msg, "id">) {
    setMessages((prev) => [...prev, { ...msg, id: nextId.current++ }]);
  }
  function bot(text: string, options?: Opt[], link?: Msg["link"]) {
    push({ from: "bot", text, options, link });
  }
  function you(text: string) {
    push({ from: "user", text });
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      setStep("idle");
      bot(errorText(e), MENU_OPTIONS);
    } finally {
      setBusy(false);
    }
  }

  function resetFlow() {
    draft.current = {};
    setStep("idle");
  }

  // ---- data ----

  async function getProducts(): Promise<Product[]> {
    if (!productsCache.current) {
      const all = await apiFetch<Product[]>("/api/products");
      productsCache.current = all.filter(isOrderable);
    }
    return productsCache.current;
  }

  // ---- conversation actions ----

  async function showCategories() {
    resetFlow();
    const categories = await apiFetch<Category[]>("/api/categories");
    bot('What are you in the mood for? Pick a category, or just type a name (like "samosa" or "2 chocolate cakes").', [
      ...categories.map((c) => ({ label: c.name, value: `cat:${c.id}` })),
      { label: "Main menu", value: "menu" },
    ]);
  }

  async function showCategory(categoryId: number) {
    productsCache.current = null; // always show fresh stock/prices when browsing
    const products = (await getProducts()).filter((p) => p.categoryId === categoryId);
    if (products.length === 0) {
      bot("Nothing is available in that category right now.", [
        { label: "⬅ Other categories", value: "order" },
        { label: "Main menu", value: "menu" },
      ]);
      return;
    }
    bot("Here's what's available — tap one to add it:", [
      ...products.map((p) => ({ label: `${p.name} (${p.unit}) — ${formatRupees(p.price)}`, value: `prod:${p.id}` })),
      { label: "⬅ Other categories", value: "order" },
    ]);
  }

  function askQuantity(product: Product) {
    draft.current.product = product;
    setStep("quantity");
    const max = Math.min(product.stockQuantity, MAX_QUANTITY);
    const quick = [1, 2, 3, 5, 10].filter((n) => n <= max);
    bot(
      `How many ${product.name}? It's ${formatRupees(product.price)} each (${product.stockQuantity} in stock). Tap a number or type one.`,
      quick.map((n) => ({ label: String(n), value: `qty:${n}` }))
    );
  }

  async function addToCart(product: Product, quantity: number) {
    const inCart = getQuantity(product.id);
    if (inCart + quantity > product.stockQuantity) {
      const room = Math.max(product.stockQuantity - inCart, 0);
      setStep("idle");
      bot(
        room === 0
          ? `You already have all ${product.stockQuantity} ${product.name} that are in stock in your cart.`
          : `Only ${product.stockQuantity} ${product.name} in stock${inCart ? ` (you already have ${inCart} in your cart)` : ""}. You can add up to ${room} more.`,
        [
          { label: "🛍️ Order something else", value: "order" },
          { label: "🛒 View cart", value: "cart" },
        ]
      );
      return;
    }

    const cart = await incrementItem(product, quantity);
    resetFlow();
    bot(`✅ Added ${quantity} × ${product.name}. Your cart total is ${formatRupees(cart?.totalAmount ?? 0)}.`, [
      { label: "➕ Add more", value: "order" },
      { label: "🛒 View cart", value: "cart" },
      { label: "✅ Checkout", value: "checkout" },
    ]);
  }

  async function chooseProduct(product: Product) {
    const qty = draft.current.qty;
    if (qty) {
      draft.current.qty = undefined;
      await addToCart(product, qty);
    } else {
      askQuantity(product);
    }
  }

  async function showCart() {
    resetFlow();
    const cart = await refreshCart();
    if (!cart || cart.items.length === 0) {
      bot("Your cart is empty.", [
        { label: "🛍️ Order food", value: "order" },
        { label: "Main menu", value: "menu" },
      ]);
      return;
    }
    const lines = cart.items.map((i) => `• ${i.quantity} × ${i.productName} — ${formatRupees(i.subtotal)}`);
    bot(`🛒 Your cart:\n${lines.join("\n")}\n\nTotal: ${formatRupees(cart.totalAmount)}`, [
      { label: "✅ Checkout", value: "checkout" },
      { label: "➕ Add more", value: "order" },
      { label: "🗑️ Clear cart", value: "clear" },
    ]);
  }

  async function clearCart() {
    resetFlow();
    await apiFetch("/api/cart", { method: "DELETE" });
    await refreshCart();
    bot("Your cart is now empty.", [{ label: "🛍️ Order food", value: "order" }, { label: "Main menu", value: "menu" }]);
  }

  async function startCheckout() {
    resetFlow();
    const cart = await refreshCart();
    if (!cart || cart.items.length === 0) {
      bot("Your cart is empty, so there's nothing to check out yet.", [
        { label: "🛍️ Order food", value: "order" },
        { label: "Main menu", value: "menu" },
      ]);
      return;
    }
    const count = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    bot(`Let's place your order — ${count} item${count === 1 ? "" : "s"}, ${formatRupees(cart.totalAmount)}. How would you like to get it?`, [
      { label: "🍽️ Dine in", value: "ful:DINE_IN" },
      { label: "🛍️ Takeaway", value: "ful:TAKEAWAY" },
      { label: "🚚 Delivery", value: "ful:DELIVERY" },
      { label: "✖ Cancel", value: "cancel" },
    ]);
  }

  async function askPhone() {
    if (profilePhone.current === undefined) {
      try {
        profilePhone.current = (await apiFetch<UserProfile>("/api/users/me")).phoneNumber;
      } catch {
        profilePhone.current = null;
      }
    }
    setStep("phone");
    const saved = profilePhone.current;
    if (saved) {
      bot(`Which phone number should we use for this order? Tap your saved number or type a different one.`, [
        { label: `Use ${saved}`, value: "phone:saved" },
      ]);
    } else {
      bot("What's the best phone number to reach you about this order? Please type it (with country code if it's not an Indian number).");
    }
  }

  async function showSummary() {
    const cart = await refreshCart();
    if (!cart || cart.items.length === 0) {
      resetFlow();
      bot("Your cart is empty now, so I can't place the order.", MENU_OPTIONS);
      return;
    }
    const d = draft.current;
    const lines = cart.items.map((i) => `• ${i.quantity} × ${i.productName} — ${formatRupees(i.subtotal)}`);
    setStep("confirm");
    bot(
      [
        "Please check your order:",
        ...lines,
        "",
        `Total: ${formatRupees(cart.totalAmount)}`,
        `Type: ${FULFILLMENT_LABELS[d.fulfillment!]}`,
        ...(d.fulfillment === "DELIVERY" ? [`Address: ${d.address}`] : []),
        `Phone: ${d.phone}`,
        "Payment: pay at counter / on delivery",
      ].join("\n"),
      [
        { label: "✅ Place order", value: "confirm:yes" },
        { label: "✖ Cancel", value: "cancel" },
      ]
    );
  }

  async function placeOrder() {
    const d = draft.current;
    if (!d.fulfillment || !d.phone) {
      resetFlow();
      bot("Something got mixed up — let's start the checkout again.", [{ label: "✅ Checkout", value: "checkout" }]);
      return;
    }
    const order = await apiFetch<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        fulfillmentType: d.fulfillment,
        contactPhone: d.phone,
        deliveryAddress: d.fulfillment === "DELIVERY" ? d.address : undefined,
        paymentMethod: "COD",
      }),
    });

    // Same as the checkout page: remember the number used so next time it's pre-filled (best effort)
    apiFetch("/api/users/me", { method: "PUT", body: JSON.stringify({ fullName, phoneNumber: d.phone }) })
      .then(() => (profilePhone.current = d.phone))
      .catch(() => {});

    resetFlow();
    await refreshCart();
    bot(
      `🎉 Order #${order.id} placed! Total ${formatRupees(order.totalAmount)}, pay at counter / on delivery. The shop will confirm it shortly.`,
      [
        { label: "🛍️ Order more", value: "order" },
        { label: "📦 My orders", value: "orders" },
      ],
      { label: "View this order", href: `/orders/${order.id}` }
    );
  }

  async function showOrders() {
    resetFlow();
    const orders = await apiFetch<Order[]>("/api/orders");
    if (orders.length === 0) {
      bot("You haven't placed any orders yet.", [{ label: "🛍️ Order food", value: "order" }]);
      return;
    }
    const lines = orders
      .slice(0, 3)
      .map((o) => `#${o.id} · ${o.status.toLowerCase()} · ${formatRupees(o.totalAmount)} · ${FULFILLMENT_LABELS[o.fulfillmentType]}`);
    bot(`Your latest orders:\n${lines.join("\n")}`, MENU_OPTIONS, { label: "See all my orders", href: "/orders" });
  }

  function showHelp() {
    resetFlow();
    bot(
      'I can help you order food right here. Tap a button, or type things like "2 samosas", "cart", "checkout" or "my orders". Type "cancel" any time to stop what you\'re doing. Orders placed here are pay-at-counter / on delivery — for online payment use the Checkout page.',
      MENU_OPTIONS
    );
  }

  function cancelFlow() {
    resetFlow();
    bot("No problem, cancelled. Anything else?", MENU_OPTIONS);
  }

  // ---- input handling ----

  async function handleOption(opt: Opt) {
    you(opt.label);
    const [kind, arg] = opt.value.split(":");
    await run(async () => {
      switch (kind) {
        case "menu":
          resetFlow();
          bot("What would you like to do?", MENU_OPTIONS);
          break;
        case "order":
          await showCategories();
          break;
        case "cat":
          await showCategory(Number(arg));
          break;
        case "prod": {
          const product = (await getProducts()).find((p) => p.id === Number(arg));
          if (!product) bot("Sorry, that item just became unavailable.", MENU_OPTIONS);
          else await chooseProduct(product);
          break;
        }
        case "qty":
          if (draft.current.product) await addToCart(draft.current.product, Number(arg));
          break;
        case "cart":
          await showCart();
          break;
        case "clear":
          await clearCart();
          break;
        case "checkout":
          await startCheckout();
          break;
        case "ful":
          draft.current.fulfillment = arg as FulfillmentType;
          if (arg === "DELIVERY") {
            setStep("address");
            bot("Please type your full delivery address (house/flat, street, area, city).");
          } else {
            await askPhone();
          }
          break;
        case "phone":
          if (profilePhone.current) {
            draft.current.phone = profilePhone.current;
            await showSummary();
          }
          break;
        case "confirm":
          await placeOrder();
          break;
        case "orders":
          await showOrders();
          break;
        case "help":
          showHelp();
          break;
        case "cancel":
          cancelFlow();
          break;
      }
    });
  }

  async function handleText(raw: string) {
    const text = raw.trim();
    if (!text) return;
    you(text);

    await run(async () => {
      // The confirmation step accepts yes/no in words
      if (step === "confirm") {
        if (YES.test(text)) return placeOrder();
        if (NO.test(text)) return cancelFlow();
        bot('Please tap "Place order" or type "yes" to confirm, or "cancel" to stop.');
        return;
      }

      // While collecting free text (an address can be literally "Home"), keywords must not hijack
      // the answer — only "cancel" still works there.
      const detected = detectIntent(text);
      const intent = (step === "address" || step === "phone") && detected !== "cancel" ? "none" : detected;
      if (intent === "cancel") return step === "idle" ? bot("Okay! Anything else?", MENU_OPTIONS) : cancelFlow();
      if (intent === "greeting" || intent === "menu") {
        resetFlow();
        return bot(intent === "greeting" ? `Hi ${firstName}! What would you like to do?` : "What would you like to do?", MENU_OPTIONS);
      }
      if (intent === "cart") return showCart();
      if (intent === "checkout") return startCheckout();
      if (intent === "orders") return showOrders();
      if (intent === "help") return showHelp();

      if (step === "quantity") {
        const qty = parseQuantity(text);
        const product = draft.current.product;
        if (qty === null || !product) {
          bot(`Please send a whole number between 1 and ${MAX_QUANTITY}.`);
          return;
        }
        return addToCart(product, qty);
      }

      if (step === "address") {
        if (!isValidAddress(text)) {
          bot("That looks too short for a delivery address. Please include house/flat, street, area and city.");
          return;
        }
        draft.current.address = text;
        return askPhone();
      }

      if (step === "phone") {
        const phone = normalizePhone(text);
        if (!phone) {
          bot("That doesn't look like a valid phone number. Please type 10–15 digits, e.g. 9876543210.");
          return;
        }
        draft.current.phone = phone;
        return showSummary();
      }

      // Idle: treat whatever they typed as a product search ("2 chocolate cakes")
      const { quantity, query } = parseOrderText(text);
      if (!query) {
        bot("I didn't quite get that. Pick an option below, or type an item name like \"samosa\".", MENU_OPTIONS);
        return;
      }
      const matches = searchProducts(await getProducts(), query);
      if (matches.length === 0) {
        bot(`Sorry, I couldn't find "${query}" in what's available right now.`, [
          { label: "🛍️ Browse categories", value: "order" },
          { label: "Main menu", value: "menu" },
        ]);
      } else if (matches.length === 1) {
        if (quantity) await addToCart(matches[0], quantity);
        else askQuantity(matches[0]);
      } else {
        draft.current.qty = quantity ?? undefined;
        bot(`I found ${matches.length} items${quantity ? ` — pick one to add ${quantity}` : ""}:`, [
          ...matches.map((p) => ({ label: `${p.name} (${p.unit}) — ${formatRupees(p.price)}`, value: `prod:${p.id}` })),
          { label: "Main menu", value: "menu" },
        ]);
      }
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const value = input;
    setInput("");
    handleText(value);
  }

  const placeholder: Record<Step, string> = {
    idle: 'Type an item, e.g. "2 samosas"…',
    quantity: "Type a quantity…",
    address: "Type your delivery address…",
    phone: "Type your phone number…",
    confirm: 'Type "yes" to confirm…',
  };

  return (
    <>
      {open && (
        <section
          aria-label="Order assistant"
          className="fixed bottom-24 right-4 z-50 flex h-[34rem] max-h-[75vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gold-light bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-gold px-4 py-3 text-ink">
            <div>
              <p className="font-semibold leading-tight">Order assistant</p>
              <p className="text-xs opacity-70">Order food right here</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full px-2 text-xl leading-none hover:bg-black/10">
              ×
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-cream/60 px-3 py-3" data-testid="chat-messages">
            {messages.map((m, idx) => {
              const isLast = idx === messages.length - 1;
              return (
                <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[85%] ${m.from === "user" ? "" : "w-full"}`}>
                    <p
                      className={`whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                        m.from === "user" ? "ml-auto w-fit bg-gold text-ink" : "w-fit bg-white text-charcoal shadow-sm"
                      }`}
                    >
                      {m.text}
                    </p>
                    {m.link && (
                      <Link href={m.link.href} onClick={() => setOpen(false)} className="mt-1 inline-block text-sm font-medium text-plum hover:underline">
                        {m.link.label} →
                      </Link>
                    )}
                    {m.options && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.options.map((o) => (
                          <button
                            key={o.value}
                            onClick={() => handleOption(o)}
                            disabled={!isLast || busy}
                            className="rounded-full border border-gold bg-white px-3 py-1 text-left text-sm text-ink transition hover:bg-gold-light disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white"
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {busy && <p className="text-xs text-charcoal/50">Typing…</p>}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-gold-light bg-white p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder[step]}
              maxLength={500}
              aria-label="Message"
              className="min-w-0 flex-1 rounded-full border border-gold-light px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close order assistant" : "Open order assistant"}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl text-ink shadow-lg transition hover:scale-105 hover:bg-gold-light"
      >
        {open ? "×" : "💬"}
      </button>
    </>
  );
}
