/**
 * Unit tests for FloatingSidebar badge functionality
 *
 * Tests verify that the badge:
 * - Shows when count > 0
 * - Hides when count is 0, null, or undefined
 * - Displays "99+" for counts > 99
 * - Has proper accessibility attributes
 *
 * **Validates: Requirements 2.1, 2.2, 2.3**
 */

import { describe, expect, test, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Home, Bell, Calendar } from "lucide-react";
import { FloatingSidebar } from "../floating-sidebar";
import type { NavItem } from "../floating-sidebar";

describe("FloatingSidebar Badge", () => {
  afterEach(() => {
    cleanup();
  });

  test("displays badge when count is greater than 0", () => {
    const mockNavItems: NavItem[] = [
      {
        label: "Requests",
        href: "/requests",
        icon: Bell,
        badge: 5,
      },
    ];
    
    const { container } = render(<FloatingSidebar items={mockNavItems} activeHref="/requests" />);
    
    // Badge should be visible with the correct count
    const badge = container.querySelector('span[aria-hidden="true"].absolute');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("5");
  });

  test("hides badge when count is 0", () => {
    const mockNavItems: NavItem[] = [
      {
        label: "Appointments",
        href: "/appointments",
        icon: Calendar,
        badge: 0,
      },
    ];
    
    const { container } = render(<FloatingSidebar items={mockNavItems} activeHref="/appointments" />);
    
    // Badge should not be visible for Appointments (count = 0)
    const badge = container.querySelector('span[aria-hidden="true"].absolute');
    expect(badge).toBeNull();
  });

  test("hides badge when count is null", () => {
    const itemsWithNull: NavItem[] = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: Home,
        badge: null,
      },
    ];
    
    const { container } = render(<FloatingSidebar items={itemsWithNull} activeHref="/dashboard" />);
    
    // Badge should not be visible
    const badge = container.querySelector('span[aria-hidden="true"].absolute');
    expect(badge).toBeNull();
  });

  test("hides badge when badge property is undefined", () => {
    const itemsWithoutBadge: NavItem[] = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: Home,
      },
    ];
    
    const { container } = render(<FloatingSidebar items={itemsWithoutBadge} activeHref="/dashboard" />);
    
    // Badge should not be visible
    const badge = container.querySelector('span[aria-hidden="true"].absolute');
    expect(badge).toBeNull();
  });

  test('displays "99+" when count exceeds 99', () => {
    const itemsWithHighCount: NavItem[] = [
      {
        label: "Requests",
        href: "/requests",
        icon: Bell,
        badge: 150,
      },
    ];
    
    const { container } = render(<FloatingSidebar items={itemsWithHighCount} activeHref="/requests" />);
    
    // Badge should show "99+"
    const badge = container.querySelector('span[aria-hidden="true"].absolute');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("99+");
  });

  test("displays exact count when badge is exactly 99", () => {
    const itemsWithExact99: NavItem[] = [
      {
        label: "Requests",
        href: "/requests",
        icon: Bell,
        badge: 99,
      },
    ];
    
    const { container } = render(<FloatingSidebar items={itemsWithExact99} activeHref="/requests" />);
    
    // Badge should show "99"
    const badge = container.querySelector('span[aria-hidden="true"].absolute');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("99");
  });

  test("includes badge count in aria-label for accessibility", () => {
    const mockNavItems: NavItem[] = [
      {
        label: "Requests",
        href: "/requests",
        icon: Bell,
        badge: 5,
      },
    ];
    
    render(<FloatingSidebar items={mockNavItems} activeHref="/requests" />);
    
    // Link with badge should have appropriate aria-label
    const requestsLink = screen.getByRole("link", { name: /Requests \(5 pending\)/i });
    expect(requestsLink).toBeTruthy();
  });

  test("does not modify aria-label when badge is 0 or undefined", () => {
    const mockNavItems: NavItem[] = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: Home,
      },
      {
        label: "Appointments",
        href: "/appointments",
        icon: Calendar,
        badge: 0,
      },
    ];
    
    render(<FloatingSidebar items={mockNavItems} activeHref="/dashboard" />);
    
    // Links without badges should have simple labels
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).toBeTruthy();
    
    const appointmentsLink = screen.getByRole("link", { name: "Appointments" });
    expect(appointmentsLink).toBeTruthy();
  });

  test("badge has aria-hidden attribute to avoid duplicate announcements", () => {
    const mockNavItems: NavItem[] = [
      {
        label: "Requests",
        href: "/requests",
        icon: Bell,
        badge: 5,
      },
    ];
    
    const { container } = render(<FloatingSidebar items={mockNavItems} activeHref="/requests" />);
    
    // Badge span should have aria-hidden="true" since count is in link's aria-label
    const badge = container.querySelector('span[aria-hidden="true"].absolute');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("5");
  });

  test("renders multiple badges correctly", () => {
    const multipleBadges: NavItem[] = [
      {
        label: "Requests",
        href: "/requests",
        icon: Bell,
        badge: 5,
      },
      {
        label: "Appointments",
        href: "/appointments",
        icon: Calendar,
        badge: 12,
      },
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: Home,
        badge: 0,
      },
    ];
    
    const { container } = render(<FloatingSidebar items={multipleBadges} activeHref="/dashboard" />);
    
    // Should see two badges (5 and 12), but not the 0
    const badges = container.querySelectorAll('span[aria-hidden="true"].absolute');
    expect(badges.length).toBe(2);
    
    const badgeTexts = Array.from(badges).map(b => b.textContent);
    expect(badgeTexts).toContain("5");
    expect(badgeTexts).toContain("12");
    
    // Dashboard should not have a badge
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink.querySelector('span[aria-hidden="true"].absolute')).toBeNull();
  });
});
