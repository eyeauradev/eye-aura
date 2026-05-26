"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Home, Calendar, FileText, User, LogOut, RefreshCw, Eye } from "lucide-react";

const navItems = [
  { href: "/patient/dashboard", label: "Dashboard", icon: Home },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/assessment", label: "Assessments", icon: Eye, isCenter: true },
  { href: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/patient/profile", label: "My Account", icon: User },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && !user.emailVerified) {
      router.push("/auth/verify-email");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/auth/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0EDE8]">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (user && !user.emailVerified) {
    return null;
  }

  const firstName = user?.displayName?.split(" ")[0] || "Patient";
  const initials = user?.displayName
    ? user.displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "P";

  return (
    <div className="min-h-screen bg-[#F0EDE8]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#0f4f4b]/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-[52px] items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/patient/dashboard" className="flex items-center gap-2.5 shrink-0">
              <Image src="/eye.png" alt="Eye Aura" width={30} height={30} className="h-[30px] w-[30px] object-contain" priority />
              <span className="font-display text-[17px] font-bold text-[#0f4f4b] tracking-tight hidden sm:block">
                Eye Aura
              </span>
            </Link>

            {/* Centre badge */}
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-[#0f4f4b]/12 bg-[#0f4f4b]/4 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0f4f4b]/35 block" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f4f4b]/45">Patient Portal</span>
            </div>

            {/* Right: user + sign out */}
            <div className="flex items-center gap-2 shrink-0">
              {/* User pill */}
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#0f4f4b]/6 border border-[#0f4f4b]/10 pl-1 pr-3 py-1">
                <div className="h-6 w-6 rounded-full bg-[#0f4f4b] grid place-items-center shrink-0">
                  <span className="text-[10px] font-bold text-white leading-none">{initials}</span>
                </div>
                <span className="text-xs font-medium text-[#0f4f4b]/65 leading-none">{firstName}</span>
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[#0f4f4b]/40 hover:text-[#0f4f4b]/80 hover:bg-[#0f4f4b]/6 transition-colors"
              >
                <LogOut className="h-[15px] w-[15px]" />
                <span className="hidden sm:inline text-xs font-medium">Sign out</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex gap-7">
          {/* Sidebar Navigation */}
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24 rounded-2xl bg-white border border-[#0f4f4b]/10 shadow-sm overflow-hidden">
              <nav className="p-3 space-y-0.5">
                <p className="px-3 pt-1 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0f4f4b]/35">Patient Portal</p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition text-sm ${
                        isActive
                          ? "bg-[#0F4F4B] text-white font-medium shadow-sm"
                          : "text-[#0f4f4b]/55 hover:bg-[#0f4f4b]/6 hover:text-[#0f4f4b]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="pt-2 mt-2 border-t border-[#0f4f4b]/8">
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition text-sm text-[#0f4f4b]/40 hover:bg-[#0f4f4b]/6 hover:text-[#0f4f4b]"
                  >
                    <Home className="h-4 w-4 shrink-0" />
                    <span>Public Home</span>
                  </Link>
                </div>
              </nav>
            </div>
          </aside>

          {/* Mobile Navigation */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-lg border-t border-[#0f4f4b]/8 z-50">
            <div className="flex items-end py-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const isCenter = item.isCenter;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition ${
                      isCenter
                        ? "bg-[#0F4F4B] text-white -mt-5 mx-1 shadow-[0_4px_16px_rgba(15,79,75,0.35)] pb-2 rounded-2xl"
                        : isActive
                          ? "text-[#0F4F4B]"
                          : "text-[#0f4f4b]/40"
                    }`}
                  >
                    <Icon className={`${isCenter ? "h-6 w-6" : "h-5 w-5"}`} />
                    <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-24 lg:pb-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
