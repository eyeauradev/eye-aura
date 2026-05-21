"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";

const quickLinks = [
  { label: "Services", href: "#services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Technology", href: "#technology" },
  { label: "Pricing", href: "#pricing" },
  { label: "About Us", href: "#founder" },
];

const patientLinks = [
  { label: "Book Consultation", href: "/booking" },
  { label: "Sign Up", href: "/auth/signup" },
  { label: "Sign In", href: "/auth/login" },
  { label: "Patient Dashboard", href: "/patient/dashboard" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Refund Policy", href: "#" },
];

export function FooterSection() {
  return (
    <footer className="bg-[#060f0e] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Top: brand + columns */}
        <div className="grid gap-12 border-b border-white/8 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <Image src="/eye-aura-logo.png" alt="Eye Aura" width={100} height={100} className="h-14 w-auto object-contain" />
            </div>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/45">
              Next-generation digital eye wellness for the screen generation. Certified tele-optometry, accessible to every Indian.
            </p>
            {/* WhatsApp CTA */}
            <a href="https://wa.me/917903357976" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl bg-green-500/15 border border-green-500/25 px-4 py-2.5 text-sm font-semibold text-green-400 transition hover:bg-green-500/22"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.334-1.508A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.8-.534-5.376-1.465l-.385-.227-3.982.948.983-3.881-.253-.4A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Chat on WhatsApp
            </a>
          </div>

          {/* Quick links */}
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-white/35">Explore</p>
            <ul className="space-y-3">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-white/50 transition hover:text-white">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Patient */}
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-white/35">For Patients</p>
            <ul className="space-y-3">
              {patientLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/50 transition hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + social */}
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-white/35">Contact</p>
            <ul className="mb-6 space-y-3">
              <li>
                <a href="tel:+917903357976" className="text-sm text-white/50 transition hover:text-white">+91 79033 57976</a>
              </li>
              <li>
                <a href="mailto:hello@eyeaura.com" className="flex items-center gap-2 text-sm text-white/50 transition hover:text-white">
                  <Mail className="h-3.5 w-3.5" /> hello@eyeaura.com
                </a>
              </li>
            </ul>
            <div className="flex gap-3">
              {[
                {
                  href: "#", label: "Instagram",
                  svg: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
                },
                {
                  href: "#", label: "X (Twitter)",
                  svg: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                },
                {
                  href: "#", label: "LinkedIn",
                  svg: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                },
              ].map(({ href, label, svg }) => (
                <a key={label} href={href}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-white/50 transition hover:bg-white/12 hover:text-white"
                  aria-label={label}
                >
                  {svg}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 py-6 text-xs text-white/25 sm:flex-row">
          <p>© {new Date().getFullYear()} Eye Aura by Harshita. All rights reserved.</p>
          <div className="flex gap-5">
            {legalLinks.map((l) => (
              <a key={l.label} href={l.href} className="transition hover:text-white/50">{l.label}</a>
            ))}
          </div>
          <p className="text-white/20">Made with care in India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
}
