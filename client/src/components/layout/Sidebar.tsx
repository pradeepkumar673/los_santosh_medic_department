import { NavLink, useNavigate } from "react-router-dom";
import { HeartPulse, LogOut, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { SIDEBAR_CONFIG, ROLE_LABELS, ROLE_ACCENT } from "../../config/sidebarConfig";

export default function Sidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isSidebarOpen, isSidebarCollapsed, closeSidebar, toggleSidebarCollapsed } = useUIStore();

  if (!user) return null;
  const items = SIDEBAR_CONFIG[user.role];
  const accent = ROLE_ACCENT[user.role];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={closeSidebar} />
      )}

      <aside
        className={clsx(
          "fixed z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-700 dark:bg-slate-800",
          "lg:static lg:translate-x-0",
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64",
          isSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-700">
          <div className="flex items-center gap-2 overflow-hidden">
            <HeartPulse className="h-7 w-7 shrink-0" style={{ color: accent }} />
            {!isSidebarCollapsed && <span className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">MediQueue AI</span>}
          </div>
          <button onClick={closeSidebar} className="text-slate-400 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="px-4 pt-4">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: `${accent}1A`, color: accent }}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isSidebarCollapsed && <span>Log out</span>}
          </button>

          <button
            onClick={toggleSidebarCollapsed}
            className="mt-1 hidden w-full items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 lg:flex"
          >
            {isSidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>
    </>
  );
}
