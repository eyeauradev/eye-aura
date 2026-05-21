"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Home, Calendar, Clock, Settings, LogOut, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/doctor/dashboard",    label: "Dashboard",    icon: Home,     isCenter: false, hideOnMobile: false },
  { href: "/doctor/requests",     label: "Requests",     icon: Bell,     isCenter: false, hideOnMobile: false },
  { href: "/",                    label: "Home",         icon: Home,     isCenter: true,  hideOnMobile: false },
  { href: "/doctor/appointments", label: "Appointments", icon: Calendar, isCenter: false, hideOnMobile: false },
  { href: "/doctor/slots",        label: "Calendar",     icon: Clock,    isCenter: false, hideOnMobile: true  },
  { href: "/doctor/profile",      label: "My Account",   icon: Settings, isCenter: false, hideOnMobile: false },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="min-h-screen bg-[#F0EDE8]">
      {/* Header */}
      <header className="border-b border-primary/10 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/doctor/dashboard" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0F4F4B] to-[#1A6B66] flex items-center justify-center">
                <span className="text-white font-bold text-lg">EA</span>
              </div>
              <span className="font-display text-xl text-primary hidden sm:block">Eye Aura</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.displayName || "Doctor"}
              </span>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <nav className="sticky top-24 space-y-2">
              {navItems.filter(item => !item.isCenter).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
                      isActive
                        ? "bg-[#0F4F4B] text-white"
                        : "text-muted-foreground hover:bg-white/50 hover:text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition text-muted-foreground hover:bg-white/50 hover:text-primary"
              >
                <Home className="h-5 w-5" />
                <span className="font-medium">Public Home</span>
              </Link>
            </nav>
          </aside>

          {/* Mobile Navigation */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-primary/10 z-50">
            <div className="flex items-end py-2">
              {navItems.filter(item => !item.hideOnMobile).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const isCenter = item.isCenter;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition ${
                      isCenter
                        ? "bg-[#0F4F4B] text-white -mt-5 mx-1 shadow-lg pb-2"
                        : isActive
                          ? "text-[#0F4F4B]"
                          : "text-muted-foreground"
                    }`}
                  >
                    <Icon className={`${isCenter ? "h-6 w-6" : "h-5 w-5"}`} />
                    <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
