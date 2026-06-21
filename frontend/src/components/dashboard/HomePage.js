import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, Tooltip } from "recharts";
import { api } from "@/lib/api";
import { fmtCurrency, fmtDateTime, fmtDate, cn } from "@/lib/utils";
import { Spinner, EmptyState, Badge, Btn, ArrowDownLeft, ArrowUpRight, Wallet, LineChart } from "../ui/SharedComponents";

const tooltipStyle = { border: "1px solid #dadce0", borderRadius: 12, box: "0 8px 24px rgba(60,64,67,.12)", fontSize: 12 };

function Sparkline({ data, dataKey, color }) {
  return <div className="h-16 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
    <defs><linearGradient id={`home-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.2} fill={`url(#home-${dataKey})`} animationDuration={700} />
  </AreaChart></ResponsiveContainer></div>;
}

export default function HomePage({ token, user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/dashboard/stats", {}, token).then(setData).catch(() => toast.error("Failed to load dashboard")).finally(() => setLoading(false)); }, [token]);
  const profitTrend = useMemo(() => [...(data?.recentArbitro || [])].reverse().map((item, index) => ({ index, profit: Number(item.netProfit || 0), volume: Number(item.volume || 0) })), [data]);
  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8 text-[#5f6368]" /></div>;

  const stats = data?.stats || {};
  const recentTransactions = data?.recentTransactions || [];
  const recentArbitro = data?.recentArbitro || [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const cards = [
    { label: "Total profit", value: fmtCurrency(stats.sharedArbitroProfit || 0), detail: "All visible Arbitro profit", color: "#34a853", key: "profit", icon: "₹" },
    { label: "Profit this month", value: fmtCurrency(stats.monthlyArbitroProfit || 0), detail: `${stats.arbitroEntries || 0} total transactions`, color: "#7c6ee6", key: "profit", icon: "↗" },
    { label: "Available balance", value: fmtCurrency(stats.balance || 0), detail: `${stats.transactions || 0} finance entries`, color: "#4285f4", key: "volume", icon: "◎" },
    { label: "Documents", value: stats.documents || 0, detail: "Files in your workspace", color: "#f9ab00", key: "volume", icon: "▤" },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-5 sm:flex-row sm:items-center">
      <div><p className="text-sm font-600 text-[#5f6368]">{greeting}</p><h1 className="mt-1 text-[30px] font-700 tracking-[-.035em] text-[#202124]">Hi {user?.name?.split(" ")[0] || "there"}</h1><p className="mt-1 text-sm text-[#80868b]">Here’s the latest performance across your workspace.</p></div>
      <Btn onClick={() => onNavigate("arbitro")} className="self-start">View Arbitro</Btn>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card, index) => <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} className="rounded-3xl bg-white p-4">
      <div className="flex items-center justify-between border-b border-[#f0f1f2] pb-3"><p className="text-sm font-700 text-[#3c4043]">{card.label}</p><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1f3f4] text-sm font-700" style={{ color: card.color }}>{card.icon}</span></div>
      <p className="mt-4 text-2xl font-700 tracking-[-.03em] text-[#202124]">{card.value}</p><p className="mt-1 text-xs text-[#80868b]">{card.detail}</p><Sparkline data={profitTrend} dataKey={card.key} color={card.color} />
    </motion.div>)}</div>

    <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between border-b border-[#f0f1f2] pb-4"><div><h2 className="font-700 text-[#202124]">Recent Arbitro profit</h2><p className="mt-1 text-xs text-[#80868b]">Profit after Estonia and India tax</p></div><Btn variant="outline" onClick={() => onNavigate("arbitro")}>See all</Btn></div>
        {!recentArbitro.length ? <div className="pt-5"><EmptyState icon={<LineChart className="h-5 w-5" />} title="No Arbitro activity" text="Your profit history will appear here." /></div> : <>
          <div className="mt-4 h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...recentArbitro].reverse()} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}><Tooltip formatter={(value) => fmtCurrency(value)} contentStyle={tooltipStyle} cursor={{ fill: "#f8f9fa" }} /><Bar dataKey="netProfit" radius={[6,6,2,2]}>{[...recentArbitro].reverse().map((item) => <Cell key={item._id} fill={item.netProfit >= 0 ? "#78c788" : "#e6847d"} />)}</Bar></BarChart></ResponsiveContainer></div>
          <div className="mt-3 space-y-1">{recentArbitro.slice(0,3).map((item) => <button key={item._id} onClick={() => onNavigate("arbitro")} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-[#f1f3f4]"><div><p className="text-sm font-600 text-[#3c4043]">{item.personName || "Arbitro transaction"}</p><p className="text-xs text-[#80868b]">{fmtDate(item.date)}</p></div><span className={cn("text-sm font-700", item.netProfit >= 0 ? "text-[#188038]" : "text-[#d93025]")}>{fmtCurrency(item.netProfit)}</span></button>)}</div>
        </>}
      </div>

      <div className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between border-b border-[#f0f1f2] pb-4"><div><h2 className="font-700 text-[#202124]">Finance activity</h2><p className="mt-1 text-xs text-[#80868b]">Latest deposits and withdrawals</p></div><Btn variant="outline" onClick={() => onNavigate("finance")}>See all</Btn></div>
        {!recentTransactions.length ? <div className="pt-5"><EmptyState icon={<Wallet className="h-5 w-5" />} title="No finance activity" text="Transactions will appear here." /></div> : <div className="mt-3 divide-y divide-[#f0f1f2]">{recentTransactions.map((tx) => <div key={tx._id} className="flex items-center gap-3 py-3">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tx.type === "deposit" ? "bg-[#e6f4ea] text-[#188038]" : "bg-[#fce8e6] text-[#d93025]")}>{tx.type === "deposit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-600 capitalize text-[#3c4043]">{tx.description || tx.type}</p><p className="text-xs text-[#80868b]">{fmtDateTime(tx.createdAt)}</p></div><div className="text-right"><p className={cn("text-sm font-700", tx.type === "deposit" ? "text-[#188038]" : "text-[#d93025]")}>{tx.type === "deposit" ? "+" : "-"}{fmtCurrency(tx.amount)}</p><Badge color={tx.status === "completed" ? "green" : "yellow"}>{tx.status}</Badge></div>
        </div>)}</div>}
      </div>
    </div>
  </div>;
}
