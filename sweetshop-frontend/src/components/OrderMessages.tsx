"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { OrderMessage } from "@/types";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

interface OrderMessagesProps {
  orderId: number;
}

export default function OrderMessages({ orderId }: OrderMessagesProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<OrderMessage[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function load() {
    apiFetch<OrderMessage[]>(`/api/orders/${orderId}/messages`).then(setMessages).catch(() => setMessages([]));
  }

  useEffect(load, [orderId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
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
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="mb-3 text-sm font-semibold text-gray-800">Messages</p>

      {messages === null ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : messages.length === 0 ? (
        <p className="mb-3 text-sm text-gray-500">No messages yet.</p>
      ) : (
        <div className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {messages.map((m) => {
            const isMine = m.senderId === user?.userId;
            return (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  isMine ? "self-end bg-amber-100 text-amber-900" : "self-start bg-gray-100 text-gray-800"
                }`}
              >
                <p className="mb-0.5 text-xs font-medium opacity-70">
                  {m.senderRole === "ADMIN" ? "Shop" : m.senderName.split(" ")[0]} · {formatDate(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message..."
          rows={2}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="self-end rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
