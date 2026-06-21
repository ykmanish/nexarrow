import { useState, useEffect, useCallback } from "react";
import { Menu, X, Bell, LogOut, LayoutGrid, FileText, Wallet, WalletCards, LineChart, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn, fmtDateTime, fmtCurrency } from "@/lib/utils";
import { BrandHeader, Btn, Spinner } from "../ui/SharedComponents";

const SearchBar = () => (
  <div className="relative hidden max-w-md flex-1 md:block">
    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9e948b]" />
    <input 
      placeholder="Search or type a command" 
    className="w-full rounded-xl border border-[#d4d4d7] bg-white py-2.5 pl-11 pr-20 text-sm text-[#2f3034] outline-none placeholder:text-[#999a9e] focus:border-[#9aabe9]"
    />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[#ece5de] bg-white px-2 py-1 text-[10px] font-700 text-[#91877f]">⌘ K</span>
  </div>
);

const SidebarItem = ({ active, icon, label, onClick, compact }) => (
  <button 
    onClick={onClick} 
    className={cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-600 transition",
      active ? "bg-[#e8f0fe] text-[#1967d2]" : "text-[#5f6064] hover:bg-[#f1f3f4] hover:text-[#202124]",
      compact && "justify-center"
    )}
  >
    <span className="shrink-0">{icon}</span>
    {!compact && <span>{label}</span>}
  </button>
);

const NotificationsDrawer = ({ isOpen, onClose, notifications, unreadCount, onMarkAllRead }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300 ease-out",
          isOpen ? "bg-black/30 backdrop-blur-sm visible opacity-100" : "bg-black/0 backdrop-blur-none invisible opacity-0"
        )} 
        onClick={onClose} 
      />
      <div className={cn(
        "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white transition-transform duration-500 ease-out will-change-transform",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-[#eee6df] px-5 py-4">
          <div>
            <h2 className="text-lg font-700 text-[#201c1a]">Notifications</h2>
            {unreadCount > 0 && <p className="text-xs text-[#8f857d]">{unreadCount} unread</p>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="rounded-full px-3 py-1.5 text-xs font-600 text-[#6d655e] transition hover:bg-[#f3ede7]">
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="rounded-full border border-[#ebe4dd] bg-white p-2 text-[#7f766e] transition hover:bg-[#f6f1ec]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe8] text-[#7a726b]">
                <Bell className="h-5 w-5" />
              </div>
              <h3 className="text-base font-700 text-[#201c1a]">No notifications</h3>
              <p className="mt-2 text-sm text-[#8e857d]">When you receive notifications, they will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f1ebe5]">
              {notifications.map((notif) => (
                <div key={notif._id || notif.id} className={cn("px-5 py-4 transition", !notif.read && "bg-[#f9f5ef]")}>
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
                      notif.type === "success" ? "bg-[#7aa173]" : 
                      notif.type === "warning" ? "bg-[#d4a14b]" : 
                      notif.type === "error" ? "bg-[#c96a6a]" : "bg-[#8d7ad0]"
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#433c38]">{notif.message}</p>
                      <p className="mt-1 text-xs text-[#9a9088]">{fmtDateTime(notif.createdAt)}</p>
                      {notif.resourceType && (
                        <p className="mt-1 text-[10px] text-[#b0a79f]">Resource: {notif.resourceType}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default function DashboardLayout({ children, user, token, activeSection, onNavigate, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api("/notifications", {}, token);
      setNotifications(data.notifications || []);
    } catch { }
  }, [token]);

  const loadDashboardStats = useCallback(async () => {
    try {
      const data = await api("/dashboard/stats", {}, token);
      setDashboardStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
    loadDashboardStats();
    const interval = setInterval(() => {
      loadNotifications();
      loadDashboardStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, loadDashboardStats]);

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" }, token);
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch { }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const navItems = [
    { id: "home", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
    { id: "finance", label: "Finance", icon: <Wallet className="h-4 w-4" /> },
    { id: "arbitro", label: "Arbitro", icon: <LineChart className="h-4 w-4" /> },
    { id: "remitBalance", label: "RemitBalance", icon: <WalletCards className="h-4 w-4" /> },
  ];
  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  const stats = dashboardStats?.stats;

  return (
    <div className="google-ui flex h-screen overflow-hidden bg-[#f1f3f4] text-[#202124]">
      {mobileSidebar && (
        <button className="fixed inset-0 z-40 bg-[#1e1a17]/35 lg:hidden" onClick={() => setMobileSidebar(false)} aria-label="Close sidebar" />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[#dadce0] bg-white transition-all duration-300 lg:relative lg:translate-x-0",
        mobileSidebar ? "translate-x-0" : "-translate-x-full",
        sidebarOpen ? "w-[260px]" : "w-[88px]"
      )}>
        <div className="flex items-center gap-3  border-[#eee6df] px-4 py-4">
          <BrandHeader compact={!sidebarOpen} />
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="ml-auto hidden rounded-full p-2 text-[#8f857d] transition hover:bg-[#f3ede7] lg:block"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setMobileSidebar(false)} 
            className="rounded-full p-2 text-[#8f857d] transition hover:bg-[#f3ede7] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {sidebarOpen && <p className="mb-2 px-3 text-xs font-700 uppercase tracking-[0.14em] text-[#9d938b]">Main</p>}
          <div className="space-y-1.5">
            {navItems.map((item) => (
              <SidebarItem 
                key={item.id} 
                active={activeSection === item.id} 
                icon={item.icon} 
                label={item.label} 
                compact={!sidebarOpen} 
                onClick={() => { onNavigate(item.id); setMobileSidebar(false); }} 
              />
            ))}
          </div>
        </div>
        
        <div className="border-t border-[#eee6df] p-3">
          <div className={cn(
            "flex items-center gap-3 rounded-[22px]  border-[#eee6df] bg-white px-3 py-3",
            !sidebarOpen && "justify-center px-2"
          )}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2c2624] text-xs font-700 text-[#f7f3ee]">
              {initials}
            </div>
            {sidebarOpen && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-700 text-[#201c1a]">{user?.name}</p>
                  <p className="truncate text-xs text-[#948b83]">{user?.email}</p>
                </div>
                <button onClick={onLogout} title="Logout" className="rounded-full p-2 text-[#8f857d] transition hover:bg-[#f4efe8] hover:text-[#201c1a]">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
      
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-[#dadce0] bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button 
              className="rounded-full border border-[#e7dfd8] bg-[#fcfaf7] p-2 text-[#7e756e] lg:hidden" 
              onClick={() => setMobileSidebar(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <SearchBar />
            <div className="ml-auto flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => setIsDrawerOpen(true)} 
                className="relative rounded-full border border-[#e7dfd8] bg-[#fcfaf7] p-2.5 text-[#7e756e] transition hover:bg-white"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#2c2624] px-1 text-[10px] font-700 text-[#f8f4ee]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <button 
                onClick={onLogout} 
                className="hidden rounded-full border border-[#e7dfd8] bg-[#fcfaf7] p-2.5 text-[#7e756e] transition hover:bg-white sm:block" 
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-[#f1f3f4] px-4 py-5 md:px-6 md:py-6">
          
          
          {statsLoading && activeSection === "home" && (
            <div className="flex h-40 items-center justify-center">
              <Spinner className="h-8 w-8 text-[#7e756e]" />
            </div>
          )}
          
          {children}
        </main>
      </div>
      
      <NotificationsDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        notifications={notifications} 
        unreadCount={unreadCount} 
        onMarkAllRead={markAllRead} 
      />
    </div>
  );
}
