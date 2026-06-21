"use client";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import DocumentsPage from "@/components/dashboard/DocumentsPage";
export default function Page() { return <DashboardPageShell activeSection="documents">{({ token }) => <DocumentsPage token={token} />}</DashboardPageShell>; }
