"use client";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import FinancePage from "@/components/dashboard/FinancePage";
export default function Page() { return <DashboardPageShell activeSection="finance">{({ token }) => <FinancePage token={token} />}</DashboardPageShell>; }
