"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, Calendar, MessageSquare, Settings, BarChart3, UserPlus, LogOut, Menu, X, Home, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href + "/"));

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/auth/login");
    }
    if (!loading && user && user.role === "admin" && !user.emailVerified) {
      router.push("/auth/verify-email");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  if (user && !user.emailVerified) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const navItems = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/doctors", icon: UserPlus, label: "Doctors" },
    { href: "/admin/services", icon: Calendar, label: "Services" },
    { href: "/admin/appointments", icon: Calendar, label: "Appointments" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/payments", icon: CreditCard, label: "Payments" },
    { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#F0EDE8]">
      {/* Header */}
      <header className="bg-white border-b border-primary/10 sticky top-0 z-50">
        <div className="flex items-center justify-between px-3 sm:px-4 lg:px-8 py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <Image src="/eye.png" alt="Eye Aura" width={36} height={36} className="h-9 w-9 object-contain" priority />
              <div>
                <h1 className="font-display text-base sm:text-xl text-primary leading-tight">Eye Aura</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Admin Portal</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-primary">{user.displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)]">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r border-primary/10 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                "hover:bg-primary/5 hover:text-primary",
                "text-muted-foreground"
              )}
            >
              <Home className="h-5 w-5" />
              <span className="font-medium">Public Home</span>
            </Link>
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <aside className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
            <div className="absolute right-0 top-0 h-full w-64 bg-white p-4" onClick={(e) => e.stopPropagation()}>
              <nav className="space-y-2 mt-16">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 pb-24 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-primary/10 py-1">
        <div className="flex">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 transition",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <div className={cn(
                "p-1 rounded-lg transition",
                isActive(item.href) ? "bg-primary/10" : ""
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className={cn("text-[10px] leading-tight text-center", isActive(item.href) && "font-semibold")}>{item.label}</span>
            </Link>
          ))}
          <Link
            href="/"
            className="flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 text-muted-foreground hover:text-primary transition"
          >
            <div className="p-1 rounded-lg"><Home className="h-5 w-5" /></div>
            <span className="text-[10px] leading-tight">Home</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
