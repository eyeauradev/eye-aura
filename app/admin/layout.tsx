"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  BarChart3,
  UserPlus,
  LogOut,
  Menu,
  X,
  CreditCard,
  RefreshCw,
  ClipboardList,
  Stethoscope,
  Home,
  MoreHorizontal,
  Globe,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingSidebar, PageTransition } from "@/components/premium";
import type { NavItem } from "@/components/premium";
import { GLASS, SPACING, SHADOWS } from "@/lib/design-tokens";

/** Admin navigation items grouped logically */
const adminNavItems: NavItem[] = [
  // Home
  { label: "Public Home", href: "/", icon: Home, group: "home" },
  // Main operations
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, group: "main" },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope, group: "main" },
  { label: "Services", href: "/admin/services", icon: ClipboardList, group: "main" },
  { label: "Assessments", href: "/admin/assessments", icon: ClipboardList, group: "main" },
  { label: "Recommendations", href: "/admin/recommendations", icon: Stethoscope, group: "main" },
  { label: "Appointments", href: "/admin/appointments", icon: Calendar, group: "main" },
  { label: "Support", href: "/admin/support", icon: LifeBuoy, group: "main" },
  // User & finance
  { label: "Users", href: "/admin/users", icon: Users, group: "management" },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, group: "management" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, group: "management" },
  // Settings
  { label: "Settings", href: "/admin/settings", icon: Settings, group: "settings" },
];

/** Bottom nav items — subset for mobile (last item is "More" with drop-up) */
const mobileNavItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { label: "Services", href: "/admin/services", icon: ClipboardList },
  { label: "Appointments", href: "/admin/appointments", icon: Calendar },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "More", href: "__more__", icon: MoreHorizontal },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreMenuOpen]);

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
      <div className="flex items-center justify-center min-h-screen bg-background">
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

  /** Check if a nav item is active using prefix matching */
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (
      pathname.startsWith(href) &&
      (pathname[href.length] === "/" || pathname[href.length] === "?")
    ) {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background layer: subtle radial gradient glows using accent/secondary at ≤10% opacity */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/[0.05] blur-[100px]" />
      </div>

      {/* Glass Header — sticky, z-index above scrollable content */}
      <header
        className={cn(
          "sticky top-0 z-50",
          GLASS.headerBackground,
          GLASS.blur,
          "border-b border-border/50"
        )}
      >
        <div className={cn("flex items-center justify-between", SPACING.pageX, "py-3")}>
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden flex items-center justify-center h-11 w-11 rounded-2xl transition-colors duration-200 text-foreground hover:bg-primary/[0.08]"
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="rounded-full bg-[#f7f3ee] p-1">
                <Image
                  src="/eye.png"
                  alt="Eye Aura"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="font-display text-base sm:text-xl text-primary leading-tight">
                  Eye Aura
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Admin Portal</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-foreground">{user.displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex items-center justify-center h-11 w-11 rounded-2xl border border-border text-foreground transition-colors duration-200 hover:bg-primary/[0.08]"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className={cn("flex", SPACING.layoutGap, SPACING.pageX, SPACING.pageY)}>
        {/* Desktop Sidebar — FloatingSidebar (hidden below lg) */}
        <FloatingSidebar
          items={adminNavItems}
          activeHref={pathname}
          ariaLabel="Admin navigation"
          className="w-60 shrink-0"
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile Slide-out Drawer (below lg) */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-background/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        >
          <aside
            className={cn(
              "absolute left-0 top-0 h-full w-72",
              GLASS.cardBackground,
              GLASS.blur,
              "border-r border-border/50",
              SHADOWS.sidebar
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Navigation drawer"
          >
            <nav className="pt-20 px-4 space-y-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ease-in-out text-sm font-medium min-h-[44px]",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-primary/[0.10]"
                    )}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation (below lg) — glass background */}
      <nav
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50",
          GLASS.headerBackground,
          GLASS.blur,
          "border-t border-border/50"
        )}
        aria-label="Mobile navigation"
      >
        <div className="flex">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isMore = item.href === "__more__";
            const active = !isMore && isActive(item.href);

            if (isMore) {
              return (
                <div key="more" className="relative flex-1 flex flex-col items-center justify-center" ref={moreMenuRef}>
                  {moreMenuOpen && (
                    <div className="absolute bottom-full mb-2 right-0 w-48 bg-card border border-border/40 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                      <Link
                        href="/"
                        onClick={() => setMoreMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                      >
                        <Globe className="h-4 w-4 text-primary" />
                        Home
                      </Link>
                      <Link
                        href="/admin/settings"
                        onClick={() => setMoreMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-primary" />
                        Settings
                      </Link>
                      <Link
                        href="/admin/support"
                        onClick={() => setMoreMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                      >
                        <LifeBuoy className="h-4 w-4 text-primary" />
                        Support
                      </Link>
                    </div>
                  )}
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 py-2 transition-colors duration-200",
                      moreMenuOpen ? "text-primary" : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-[44px] w-[44px] rounded-2xl transition-colors duration-200",
                      moreMenuOpen ? "bg-primary/[0.10]" : ""
                    )}>
                      {moreMenuOpen ? <X className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className="text-[10px] leading-tight text-center">
                      {moreMenuOpen ? "Close" : item.label}
                    </span>
                  </button>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 py-2 transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
                aria-current={active ? "page" : undefined}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-[44px] w-[44px] rounded-2xl transition-colors duration-200",
                    active ? "bg-primary/[0.10]" : ""
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight text-center",
                    active && "font-semibold"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
