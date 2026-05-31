import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { fmtCurrency, fmtDateTime, cn } from "@/lib/utils";
import { Spinner, EmptyState, Badge, Btn, ArrowDownLeft, ArrowUpRight, Wallet } from "../ui/SharedComponents";

export default function HomePage({ token, user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api("/dashboard/stats", {}, token);
        setStats(data);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8 text-[#7e756e]" /></div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const recentTransactions = stats?.recentTransactions || [];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="rounded-[30px] flex justify-between border-[#ebe3db] bg-[#fcfaf7] p-6">
        <div>
            <p className="text-sm font-600 text-[#8a8179]">{greeting}</p>
        <h1 className="mt-1 small text-[34px] font-700 font-semibold tracking-[-0.04em] text-[#000000]">Hiee {user?.name?.split(" ")[0] || "there"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#8e857d]">Here are your most recent transactions.</p>
        </div>
        <div>
            <img src="/greet.png" alt="Greeting" className="h-24 w-24 object-contain" />
        </div>
        
      </div>
      <div className="rounded-[30px] border-[#ebe3db] bg-[#fcfaf7] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-700 text-[#201c1a]">Recent transactions</h3>
            <p className="text-xs text-[#978d85]">Latest finance activity from your account</p>
          </div>
          <Btn variant="outline" onClick={() => onNavigate("finance")}>View all</Btn>
        </div>
        {recentTransactions.length === 0 ? (
          <EmptyState icon={<Wallet className="h-5 w-5" />} title="No transactions yet" text="When you start adding deposits or withdrawals, your recent transactions will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#f0e9e2] text-left text-xs font-700 uppercase tracking-[0.12em] text-[#9d938b]">
                  <th className="px-2 py-3">Type</th><th className="px-2 py-3">Description</th><th className="px-2 py-3">Reference</th><th className="px-2 py-3">Date</th><th className="px-2 py-3 text-right">Amount</th><th className="px-2 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx._id || tx.id} className="border-b border-[#f5efe9] last:border-b-0">
                    <td className="px-2 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", tx.type === "deposit" ? "bg-[#e8f3e5] text-[#5d7b58]" : "bg-[#fdeaea] text-[#b85555]")}>
                          {tx.type === "deposit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </span>
                        <span className="font-600 capitalize text-[#3d3733]">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-[#4f4944]">{tx.description || "-"}</td>
                    <td className="px-2 py-4 font-mono text-xs text-[#8f857d]">{tx.reference || "-"}</td>
                    <td className="px-2 py-4 text-[#6f6760]">{fmtDateTime(tx.createdAt)}</td>
                    <td className={cn("px-2 py-4 text-right font-700", tx.type === "deposit" ? "text-[#5d7b58]" : "text-[#b85555]")}>{tx.type === "deposit" ? "+" : "-"}{fmtCurrency(tx.amount)}</td>
                    <td className="px-2 py-4 text-center"><Badge color={tx.status === "completed" ? "green" : tx.status === "pending" ? "yellow" : "red"}>{tx.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}