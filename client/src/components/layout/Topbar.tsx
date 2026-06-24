import { Menu, Bell, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { ROLE_LABELS } from "../../config/sidebarConfig";

export default function Topbar() {
  const user = useAuthStore((s) => s.user);
  const { toggleSidebar, notifications, unreadCount, markAllRead } = useUIStore();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button onClick={toggleSidebar} className="text-slate-500 lg:hidden">
        <Menu className="h-6 w-6" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications((v) => !v);
              if (!showNotifications) markAllRead();
            }}
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Notifications</div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">You're all caught up.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="border-b border-slate-50 px-4 py-3 text-sm">
                      <p className="font-medium text-slate-700">{n.title}</p>
                      <p className="text-slate-500">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden text-sm sm:block">
            <p className="font-medium text-slate-700">{user.name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
        </div>
      </div>
    </header>
  );
}
