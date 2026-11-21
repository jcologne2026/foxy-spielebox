export interface NavItem {
  label: string;
  to: string;
  icon: string;
}

/**
 * Einträge der unteren Navigationsleiste (SPEC §7).
 * „Verwaltung“ sehen nur Admins.
 */
export function getNavItems(isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { label: "Start", to: "/", icon: "🏠" },
    { label: "Historie", to: "/historie", icon: "📜" },
    { label: "Hall of Fame", to: "/hall-of-fame/flip7", icon: "🏆" },
  ];
  if (isAdmin) {
    items.push({ label: "Verwaltung", to: "/verwaltung", icon: "⚙️" });
  }
  return items;
}
