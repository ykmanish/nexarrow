"use client";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import ArbitroPage from "@/components/dashboard/ArbitroPage";
export default function Page() { return <DashboardPageShell activeSection="arbitro">{({ token }) => <ArbitroPage token={token} />}</DashboardPageShell>; }
