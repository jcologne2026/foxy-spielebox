export interface NavItem {
  label: string;
  to: string;
}

/**
 * Einträge der unteren Navigationsleiste (SPEC §7).
 * „Verwaltung“ sehen nur Admins.
 */
export function getNavItems(isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { label: "Start", to: "/" },
    { label: "Historie", to: "/historie" },
    { label: "Hall of Fame", to: "/hall-of-fame/flip7" },
  ];
  if (isAdmin) {
    items.push({ label: "Verwaltung", to: "/verwaltung" });
  }
  return items;
}
