
import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Menu,
  X,
  PlaneTakeoff,
  CalendarCheck,
  CreditCard,
  Map,
  Bell,
  LogOut,
  LayoutDashboard,
  UserRound,
  ChevronDown,
  MessageSquare,
  Settings,
  BarChart3,
  Users,
  Hotel,
  MapPinned,
  ClipboardList,
  Star,
  Mail,
  ShieldCheck,
  Compass,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

// ========================================
// Public Navigation
// ========================================

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/destinations", label: "Destinations" },
  { to: "/packages", label: "Tour Packages" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

// ========================================
// Customer Navigation
// ========================================

const customerLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/my-bookings",
    label: "My Bookings",
    icon: CalendarCheck,
  },
  {
    to: "/payments",
    label: "My Payments",
    icon: CreditCard,
  },
  {
    to: "/my-trips",
    label: "My Trips",
    icon: Map,
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    to: "/feedback",
    label: "Feedback",
    icon: MessageSquare,
  },
  {
    to: "/profile",
    label: "My Profile",
    icon: UserRound,
  },
];

// ========================================
// Admin Navigation
// ========================================

const adminLinks = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/insights",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    to: "/admin/bookings",
    label: "Bookings",
    icon: CalendarCheck,
  },
  {
    to: "/admin/payments",
    label: "Payments",
    icon: CreditCard,
  },
  {
    to: "/admin/customers",
    label: "Customers",
    icon: Users,
  },
  {
    to: "/admin/catalog",
    label: "Tour Catalog",
    icon: Compass,
  },
  {
    to: "/admin/itineraries",
    label: "Itineraries",
    icon: MapPinned,
  },
  {
    to: "/admin/resources",
    label: "Resources",
    icon: Hotel,
  },
  {
    to: "/admin/trips",
    label: "Trip Management",
    icon: Map,
  },
  {
    to: "/admin/reports",
    label: "Reports",
    icon: ClipboardList,
  },
  {
    to: "/admin/reviews",
    label: "Reviews",
    icon: Star,
  },
  {
    to: "/admin/feedback",
    label: "Feedback",
    icon: Mail,
  },
  {
    to: "/admin/notifications",
    label: "Notifications",
    icon: Bell,
  },
];

// ========================================
// Styles
// ========================================

const publicNavClass = ({ isActive }) =>
  [
    "relative inline-flex shrink-0 items-center",
    "rounded-xl px-3 py-2.5",
    "text-sm font-semibold whitespace-nowrap",
    "transition-all duration-200",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-blue-700",
  ].join(" ");

const dropdownLinkClass = ({ isActive }) =>
  [
    "flex items-center gap-3 rounded-xl",
    "px-3 py-2.5 text-sm font-medium",
    "transition-colors duration-200",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");

// ========================================
// Navbar Component
// ========================================

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const accountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";
  const isCustomer = user?.role === "customer";
  const isVendor = user?.role === "vendor";

  const roleLinks = isAdmin
    ? adminLinks
    : isCustomer
    ? customerLinks
    : isVendor
    ? [
        {
          to: "/vendor",
          label: "Vendor Dashboard",
          icon: LayoutDashboard,
        },
      ]
    : [];

  const dashboardPath = isAdmin
    ? "/admin/dashboard"
    : isVendor
    ? "/vendor"
    : "/dashboard";

  const notificationPath = isAdmin
    ? "/admin/notifications"
    : "/notifications";

  const displayName = user?.name || "My Account";

  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  // Close menus after navigation
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // Close account dropdown on outside click / Escape
  useEffect(() => {
    function handleOutside(event) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setMobileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function signOut() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
      setAccountOpen(false);
      setMobileOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Could not log out. Please retry.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
      <nav className="container-wide mx-auto flex h-[76px] items-center justify-between gap-4 px-4">
        {/* ====================================
            Logo
        ==================================== */}

        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="TravelEase Home"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-100">
            <PlaneTakeoff size={25} strokeWidth={2.2} />
          </span>

          <span className="text-xl font-extrabold tracking-tight text-slate-900 xl:text-2xl">
            Travel<span className="text-blue-600">Ease</span>
          </span>
        </Link>

        {/* ====================================
            Desktop Public Navigation
        ==================================== */}

        <div className="hidden min-w-0 items-center gap-1 lg:flex">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={publicNavClass}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* ====================================
            Desktop Right Actions
        ==================================== */}

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {user ? (
            <>
              {/* Notification Button */}

              {!isVendor && (
                <Link
                  to={notificationPath}
                  title="Notifications"
                  aria-label="Notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Bell size={19} />
                </Link>
              )}

              {/* Dashboard Shortcut */}

              <Link
                to={dashboardPath}
                className="hidden items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 xl:inline-flex"
              >
                <LayoutDashboard size={17} />
                Dashboard
              </Link>

              {/* Account Dropdown */}

              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() =>
                    setAccountOpen((previous) => !previous)
                  }
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 transition hover:border-blue-200 hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 text-sm font-bold text-white">
                    {initials || "U"}
                  </span>

                  <span className="hidden max-w-28 truncate text-left text-sm font-semibold text-slate-800 xl:block">
                    {displayName}
                  </span>

                  <ChevronDown
                    size={16}
                    className={`text-slate-500 transition-transform ${
                      accountOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+12px)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/70"
                  >
                    {/* User Info */}

                    <div className="border-b border-slate-100 px-3 py-3">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {displayName}
                      </p>

                      <p className="mt-1 text-xs capitalize text-slate-500">
                        {user.role} Account
                      </p>
                    </div>

                    {/* Role Links */}

                    <div className="max-h-[55vh] space-y-0.5 overflow-y-auto py-2">
                      {roleLinks.map(
                        ({ to, label, icon: Icon }) => (
                          <NavLink
                            key={to}
                            to={to}
                            role="menuitem"
                            onClick={() =>
                              setAccountOpen(false)
                            }
                            className={dropdownLinkClass}
                          >
                            <Icon size={17} />
                            <span>{label}</span>
                          </NavLink>
                        )
                      )}
                    </div>

                    {/* Logout */}

                    <div className="border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={loggingOut}
                        onClick={signOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <LogOut size={17} />
                        {loggingOut
                          ? "Logging out..."
                          : "Logout"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700"
              >
                Sign Up
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>

        {/* ====================================
            Mobile Menu Button
        ==================================== */}

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() =>
            setMobileOpen((previous) => !previous)
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-blue-50 lg:hidden"
        >
          {mobileOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </nav>

      {/* ====================================
          Mobile Navigation
      ==================================== */}

      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-100 bg-white lg:hidden"
        >
          <div className="max-h-[calc(100vh-76px)] space-y-1 overflow-y-auto px-4 py-4">
            {/* Public Links */}

            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Explore
            </p>

            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={dropdownLinkClass}
              >
                {link.label}
              </NavLink>
            ))}

            {user ? (
              <>
                <div className="my-4 border-t border-slate-100" />

                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
                    {initials || "U"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {displayName}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {user.role} Account
                    </p>
                  </div>
                </div>

                <p className="px-3 pb-2 pt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  My Account
                </p>

                {roleLinks.map(
                  ({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() =>
                        setMobileOpen(false)
                      }
                      className={dropdownLinkClass}
                    >
                      <Icon size={18} />
                      {label}
                    </NavLink>
                  )
                )}

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 disabled:opacity-50"
                  >
                    <LogOut size={18} />
                    {loggingOut
                      ? "Logging out..."
                      : "Logout"}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <Link
                  to="/login"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className="rounded-xl border border-blue-200 px-4 py-3 text-center font-semibold text-blue-700"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
