"use client";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import HomePage from "@/components/dashboard/HomePage";
export default function Page() { return <DashboardPageShell activeSection="home">{({ token, user, navigate }) => <HomePage token={token} user={user} onNavigate={navigate} />}</DashboardPageShell>; }
