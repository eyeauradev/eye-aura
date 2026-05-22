"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Home, Calendar, FileText, MessageSquare, User, LogOut, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/patient/dashboard", label: "Dashboard", icon: Home },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar },
  { href: "/", label: "Home", icon: Home, isCenter: true },
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
      <header className="border-b border-[#0f4f4b]/8 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center justify-between">
            <Link href="/patient/dashboard" className="flex items-center gap-2.5">
              <Image src="/eye.png" alt="Eye Aura" width={36} height={36} className="h-9 w-9 object-contain" priority />
              <div className="hidden sm:block">
                <span className="font-display text-lg text-[#0f4f4b] leading-none block">Eye Aura</span>
                <span className="text-[10px] text-[#0f4f4b]/40 leading-none">by Harshita</span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-[#0f4f4b] grid place-items-center">
                  <span className="text-[11px] font-bold text-white">{initials}</span>
                </div>
                <span className="text-sm font-medium text-[#0f4f4b]/70">{firstName}</span>
              </div>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center gap-2 h-8 text-xs rounded-xl px-3 border-[#0f4f4b]/15 text-[#0f4f4b]/60 hover:text-[#0f4f4b]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
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
                {navItems.filter(item => !item.isCenter).map((item) => {
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
