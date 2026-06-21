"use client";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import RemitBalancePage from "@/components/dashboard/RemitBalancePage";

export default function Page() {
  return <DashboardPageShell activeSection="remitBalance">{({ token }) => <RemitBalancePage token={token} />}</DashboardPageShell>;
}
