"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "./DashboardLayout";
import { ToasterProvider, Spinner } from "../ui/SharedComponents";

const paths = { home: "/dashboard", documents: "/dashboard/documents", finance: "/dashboard/finance", arbitro: "/dashboard/arbitro" };

export default function DashboardPageShell({ activeSection, children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  useEffect(() => {
    try {
      const token = localStorage.getItem("nexus_token");
      const rawUser = localStorage.getItem("nexus_user");
      if (!token || !rawUser) { router.replace("/login"); return; }
      document.cookie = `nexus_token=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
      setSession({ token, user: JSON.parse(rawUser) });
    } catch { router.replace("/login"); }
  }, [router]);
  if (!session) return <div className="flex min-h-screen items-center justify-center bg-[#f1f3f4]"><Spinner className="h-7 w-7 text-[#5f6368]" /></div>;
  const logout = () => {
    localStorage.removeItem("nexus_token"); localStorage.removeItem("nexus_user");
    document.cookie = "nexus_token=; path=/; max-age=0; samesite=lax";
    router.replace("/login");
  };
  return <><ToasterProvider /><DashboardLayout user={session.user} token={session.token} activeSection={activeSection}
    onNavigate={(section) => router.push(paths[section] || "/dashboard")} onLogout={logout}>
    {children({ token: session.token, user: session.user, navigate: (section) => router.push(paths[section] || "/dashboard") })}
  </DashboardLayout></>;
}
