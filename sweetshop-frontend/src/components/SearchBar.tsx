"use client";

import { useEffect, useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [raw, setRaw] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => onChange(raw), 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  return (
    <input
      type="search"
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      placeholder="Search products... (e.g. sa for Samosa)"
      className="mb-4 w-full max-w-sm rounded-md border border-gold-light px-3 py-2 text-sm text-charcoal focus:border-gold focus:outline-none"
    />
  );
}
