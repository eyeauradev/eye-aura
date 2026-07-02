"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackCtaClick, trackNavAnchorClick } from "@/services/analytics/analytics.service";

const links = [
  { label: "Services", href: "/services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Technology", href: "#technology" },
  { label: "About", href: "#founder" },
];

export function NavBar({ user, loading }: { user: any; loading?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <nav
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between rounded-2xl border px-5 py-3 transition-all duration-500",
            scrolled
              ? "border-white/50 bg-white/95 shadow-[0_8px_32px_rgba(15,79,75,0.12)] backdrop-blur-xl"
              : "border-white/20 bg-white/60 backdrop-blur-md"
          )}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-full bg-[#f7f3ee] p-1">
              <Image src="/eye.png" alt="Eye Aura" width={46} height={46} className="rounded-full object-contain" priority />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0f4f4b]">Eye Aura</p>
              <p className="text-[11px] font-light tracking-wide text-[#0f4f4b]/55 md:text-[11px] text-[10px]">
                Because every eye has a story
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {links.map((l) =>
              l.href.startsWith("#") ? (
                <a key={l.href} href={l.href}
                  onClick={() => trackNavAnchorClick(l.label)}
                  className="text-sm font-medium text-[#0f4f4b]/65 transition hover:text-[#0f4f4b]"
                >{l.label}</a>
              ) : (
                <Link key={l.href} href={l.href}
                  onClick={() => trackNavAnchorClick(l.label)}
                  className="text-sm font-medium text-[#0f4f4b]/65 transition hover:text-[#0f4f4b]"
                >{l.label}</Link>
              )
            )}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-20 animate-pulse rounded-xl bg-[#0f4f4b]/8" />
                <div className="h-10 w-36 animate-pulse rounded-xl bg-[#0f4f4b]/8" />
              </div>
            ) : user ? (
              <Link href={`/${user.role}/dashboard`}
                onClick={() => trackCtaClick({ label: "Dashboard", location: "navbar" })}
                className="rounded-xl bg-[#0f4f4b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3a36]"
              >Dashboard</Link>
            ) : (
              <>
                <Link href="/auth/login"
                  onClick={() => trackCtaClick({ label: "Sign In", location: "navbar" })}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f4f4b] transition hover:bg-[#0f4f4b]/5"
                >Sign In</Link>
                <Link href="/booking"
                  onClick={() => trackCtaClick({ label: "Book Consultation", location: "navbar" })}
                  className="rounded-xl bg-[#0f4f4b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3a36]"
                >Book Consultation</Link>
              </>
            )}
          </div>

          <button onClick={() => setOpen(true)} className="rounded-xl p-2 text-[#0f4f4b] md:hidden">
            <Menu className="h-6 w-6" />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col bg-[#0a1c1b]"
          >
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-full bg-[#f7f3ee] p-1">
                  <Image src="/eye.png" alt="Eye Aura" width={42} height={42} className="rounded-full object-contain" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Eye Aura</span>
                  <span className="text-[10px] font-light tracking-wide text-white/45">
                    Because every eye has a story
                  </span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-white/50 transition hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-center px-8">
              {links.map((l, i) =>
              l.href.startsWith("#") ? (
                <motion.a
                  key={l.href} href={l.href}
                  onClick={() => { setOpen(false); trackNavAnchorClick(l.label); }}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.07 }}
                  className="border-b border-white/10 py-5 text-2xl font-light text-white/70 transition hover:text-white"
                >{l.label}</motion.a>
              ) : (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.07 }}
                >
                  <Link
                    href={l.href}
                    onClick={() => { setOpen(false); trackNavAnchorClick(l.label); }}
                    className="block border-b border-white/10 py-5 text-2xl font-light text-white/70 transition hover:text-white"
                  >{l.label}</Link>
                </motion.div>
              )
            )}
            </div>

            <div className="flex flex-col gap-3 px-8 pb-12">
              {loading ? (
                <div className="flex flex-col gap-3">
                  <div className="h-14 animate-pulse rounded-2xl bg-white/10" />
                  <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
                </div>
              ) : user ? (
                <>
                  <Link href={`/${user.role}/dashboard`} onClick={() => { setOpen(false); trackCtaClick({ label: "Go to Dashboard", location: "navbar_mobile" }); }}
                    className="flex h-14 items-center justify-center rounded-2xl bg-[#1a9e98] text-base font-semibold text-white"
                  >Go to Dashboard</Link>
                  {user.role === "patient" && (
                    <Link href="/booking" onClick={() => { setOpen(false); trackCtaClick({ label: "Book Consultation", location: "navbar_mobile" }); }}
                      className="flex h-14 items-center justify-center rounded-2xl border border-white/20 text-base font-medium text-white/70"
                    >Book Consultation</Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/booking" onClick={() => { setOpen(false); trackCtaClick({ label: "Book Consultation", location: "navbar_mobile" }); }}
                    className="flex h-14 items-center justify-center rounded-2xl bg-[#1a9e98] text-base font-semibold text-white"
                  >Book Consultation</Link>
                  <Link href="/auth/login" onClick={() => { setOpen(false); trackCtaClick({ label: "Sign In", location: "navbar_mobile" }); }}
                    className="flex h-14 items-center justify-center rounded-2xl border border-white/20 text-base font-medium text-white/70"
                  >Sign In</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
