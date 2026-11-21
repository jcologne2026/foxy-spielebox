import { NavLink } from "react-router";
import { getNavItems } from "./navItems";
import { useSession } from "./session";

export function BottomNav() {
  const { isAdmin } = useSession();
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {getNavItems(isAdmin).map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"}>
          <span className="nav-icon" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
