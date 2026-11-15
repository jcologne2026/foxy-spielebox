import { NavLink } from "react-router";
import { getNavItems } from "./navItems";

// Platzhalter bis zum Login in Phase 4: Solange es keine Konten gibt, ist jeder Admin.
const IS_ADMIN_PLACEHOLDER = true;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {getNavItems(IS_ADMIN_PLACEHOLDER).map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
