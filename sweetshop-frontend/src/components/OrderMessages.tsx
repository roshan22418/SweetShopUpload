"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { OrderMessage } from "@/types";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

interface OrderMessagesProps {
  orderId: number;
}

// How often an open thread checks for replies (only while the tab is visible).
const REFRESH_MS = 15_000;

export default function OrderMessages({ orderId }: OrderMessagesProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<OrderMessage[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiFetch<OrderMessage[]>(`/api/orders/${orderId}/messages`)
      .then(setMessages)
      .catch(() => setMessages((current) => current ?? []));
  }, [orderId]);

  // Replies from the other side show up without a reload.
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages?.length]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setError(null);
    setSending(true);
    try {
      await apiFetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: text.trim() }),
      });
      setText("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card" aria-label="Messages about this order">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="section-title">Messages</h2>
        <span className="text-xs text-charcoal/50">
          {user?.role === "ADMIN" ? "Visible to the customer" : "Goes straight to the shop"}
        </span>
      </div>

      {messages === null ? (
        <p className="text-sm text-charcoal/50">Loading...</p>
      ) : messages.length === 0 ? (
        <p className="mb-3 text-sm text-charcoal/60">No messages yet. Ask anything about this order.</p>
      ) : (
        <div ref={listRef} className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1" aria-live="polite">
          {messages.map((m) => {
            const isMine = m.senderId === user?.userId;
            return (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? "self-end rounded-br-md bg-gold-light/60 text-ink" : "self-start rounded-bl-md bg-cream text-charcoal ring-1 ring-gold-light/60"
                }`}
              >
                <p className="mb-0.5 text-xs font-medium opacity-60">
                  {isMine ? "You" : m.senderRole === "ADMIN" ? "Shop" : m.senderName.split(" ")[0]} · {formatDate(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="alert-error mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor={`message-${orderId}`} className="sr-only">
          Write a message
        </label>
        <textarea
          id={`message-${orderId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          placeholder="Write a message..."
          maxLength={1000}
          rows={2}
          className="field flex-1"
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn-primary self-end">
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
