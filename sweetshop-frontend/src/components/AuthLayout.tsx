import { ReactNode } from "react";

const AUTH_IMAGE = "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1000&q=75&auto=format&fit=crop";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-gold-light/50 md:grid-cols-2">
      <div className="hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AUTH_IMAGE} alt="Inside our bakery" className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center justify-center bg-cream p-8 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
