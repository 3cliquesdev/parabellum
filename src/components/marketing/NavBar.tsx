"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface NavBarProps {
  hideCTA?: boolean;
  links?: { label: string; href: string }[];
  ctaLabel?: string;
  ctaHref?: string;
}

const DEFAULT_LINKS = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Planos", href: "#planos" },
  { label: "Blog", href: "#blog" },
];

export function NavBar({
  hideCTA = false,
  links,
  ctaLabel = "Começar grátis",
  ctaHref = "/signup",
}: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const navLinks = links ?? DEFAULT_LINKS;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 h-[68px] transition-all duration-300"
      style={{
        background: scrolled ? "rgba(5,6,8,0.92)" : "rgba(5,6,8,0.7)",
        backdropFilter: "blur(16px)",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid rgba(255,255,255,0.05)",
        boxShadow: scrolled ? "0 1px 40px rgba(0,0,0,0.6)" : "none",
      }}
    >
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: "#22C55E" }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
          </svg>
        </div>
        <span
          className="font-bold text-white tracking-tight"
          style={{ fontSize: 15, fontFamily: "var(--font-sans)" }}
        >
          Liberty CRM
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-7">
        {navLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-sm transition-colors duration-150 hover:text-white"
            style={{ color: "#CBD5E1", fontWeight: 600 }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        {!hideCTA && (
          <Link
            href={ctaHref}
            className="text-sm px-5 py-2.5 rounded-xl font-bold inline-flex items-center transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(34,197,94,0.25), 0 2px 8px rgba(0,0,0,0.4)",
              fontSize: 13,
            }}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
