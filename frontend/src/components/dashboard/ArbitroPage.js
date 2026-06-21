import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip, AreaChart, Area } from "recharts";
import { api } from "@/lib/api";
import { fmt, fmtCurrency, fmtDate, cn, formatDateInput } from "@/lib/utils";
import {
  SectionTitle, Btn, Plus, Filter, StyledDatePicker, Spinner, Badge, Eye, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, Check, Modal, TextArea, ConfirmModal, DetailGrid,
  Sparkles, VisibilitySelector
} from "../ui/SharedComponents";

const REMITTANCE_PLATFORMS = [
  { value: "Western Union", logo: "/platforms/wu.png" },
  { value: "DBS", logo: "/platforms/dbs.jpg" },
  { value: "IndusInd", logo: "/platforms/indusind.png" },
  { value: "Niyo Global", logo: "/platforms/niyo.png" },
];
const BUYING_PLATFORMS = [
  { value: "Binance", logo: "/platforms/binance.png" },
  { value: "Bybit", logo: "/platforms/bybit.png" },
];
const emptyPurchase = () => ({ rateEuro: "", sellerName: "", volumeEuro: "" });
const emptySale = () => ({ rateInr: "", buyerName: "", usdtAmount: "" });
const initialForm = () => ({
  remittancePlatform: "Western Union", personName: "", date: formatDateInput(new Date()),
  remittedBankPlatform: "", euroRate: "", volume: "", remittanceFees: "",
  usdcBuyingPlatform: "Binance", usdcBuyingDate: formatDateInput(new Date()),
  usdcPurchases: [emptyPurchase()], usdtSellingAccountName: "",
  usdtSellingDate: formatDateInput(new Date()), usdtSales: [emptySale()], notes: ""
});

const inputClass = "w-full rounded-lg border border-[#d5d5d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8a9fe8] focus:ring-2 focus:ring-[#9baded]/20";

function Field({ label, value, onChange, type = "text", placeholder, required = true, readOnly = false }) {
  return <div className="space-y-2">
    <label className="block text-sm font-600 text-[#5c554f]">{label}</label>
    <input type={type} step={type === "number" ? "any" : undefined} min={type === "number" ? "0" : undefined}
      value={value} onChange={onChange} placeholder={placeholder} required={required} readOnly={readOnly}
      className={cn(inputClass, readOnly && "bg-[#f3eee8]  text-[#766d66]")} />
  </div>;
}

function PlatformSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const selected = options.find((item) => item.value === value) || options[0];
  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return <div className="space-y-2">
    <label className="block text-sm font-600 text-[#5c554f]">{label}</label>
    <div className="relative" ref={root}>
      <button type="button" onClick={() => setOpen((current) => !current)}
        className={cn(inputClass, "flex items-center  gap-3 text-left", open && "ring-2  ring-[#8c7cf0]/15")}>
        <img src={selected.logo} alt="" className="h-7 w-7 rounded-lg  object-contain" />
        <span className="flex-1 font-600 text-[#34343a]">{selected.value}</span>
        <ChevronDown className={cn("h-4 w-4 text-[#8a8b91] transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0, y: -7, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .16 }}
          className="floating-control-menu absolute left-0 right-0 top-[calc(100%+7px)] z-40 overflow-hidden rounded-2xl bg-white p-1.5">
          {options.map((item) => {
            const active = item.value === value;
            return <button key={item.value} type="button" onClick={() => { onChange(item.value); setOpen(false); }}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition", active ? "bg-[#eeeaff] text-[#5d4ca4]" : "text-[#4b4c52] hover:bg-[#f2f2f4]")}>
              <img src={item.logo} alt="" className="h-7 w-7 rounded-lg object-contain" />
              <span className="flex-1 font-600">{item.value}</span>
              {active && <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#7b68d8] text-white"><Check className="h-3 w-3" /></span>}
            </button>;
          })}
        </motion.div>}
      </AnimatePresence>
    </div>
  </div>;
}

function RepeatableRows({ type, rows, onChange }) {
  const purchase = type === "purchase";
  const update = (index, key, value) => onChange(rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
  const remove = (index) => rows.length > 1 && onChange(rows.filter((_, i) => i !== index));
  return <div className="space-y-3">
    {rows.map((row, index) => <div key={index} className="rounded-xl bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-700 uppercase tracking-[0.12em] text-[#9b9188]">{purchase ? "Purchase" : "Sale"} #{index + 1}</span>
        {rows.length > 1 && <button type="button" onClick={() => remove(index)} className="rounded-xl p-2 text-[#a24f4f] hover:bg-[#fdeaea]"><Trash2 className="h-4 w-4" /></button>}
      </div>
      <div className={cn("grid gap-3", purchase ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4")}>
        <Field label={purchase ? "USDC buying rate (EUR)" : "USDT selling rate (INR)"} type="number"
          placeholder={purchase ? "e.g. 0.92" : "e.g. 91.50"} value={purchase ? row.rateEuro : row.rateInr}
          onChange={(e) => update(index, purchase ? "rateEuro" : "rateInr", e.target.value)} />
        <Field label={purchase ? "USDC seller name" : "USDT buyer name"} placeholder="Full name"
          value={purchase ? row.sellerName : row.buyerName}
          onChange={(e) => update(index, purchase ? "sellerName" : "buyerName", e.target.value)} />
        <Field label={purchase ? "Buying volume (EUR)" : "USDT amount for selling"} type="number"
          placeholder={purchase ? "e.g. 1,500" : "e.g. 1,500 USDT"} value={purchase ? row.volumeEuro : row.usdtAmount}
          onChange={(e) => update(index, purchase ? "volumeEuro" : "usdtAmount", e.target.value)} />
        {!purchase && <Field label="INR proceeds (automatic)" value={fmt(Number(row.usdtAmount || 0) * Number(row.rateInr || 0), 2)} onChange={() => {}} readOnly />}
      </div>
      {purchase && row.rateEuro && row.volumeEuro && <p className="mt-3 text-right text-xs text-[#7d736c]">≈ {fmt(Number(row.volumeEuro) / Number(row.rateEuro), 2)} USDC</p>}
      {!purchase && row.rateInr && row.usdtAmount && <p className="mt-3 text-right text-xs text-[#7d736c]">{fmt(row.usdtAmount, 2)} USDT × ₹{fmt(row.rateInr, 2)} = {fmtCurrency(Number(row.usdtAmount) * Number(row.rateInr))}</p>}
    </div>)}
    <Btn type="button" variant="secondary" onClick={() => onChange([...rows, purchase ? emptyPurchase() : emptySale()])} className="w-full gap-2">
      <Plus className="h-4 w-4" />Add another {purchase ? "rate / seller" : "rate / buyer"}
    </Btn>
  </div>;
}

const ArbitroModal = ({ open, onClose, token, onSaved }) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  useEffect(() => { if (open) api("/users", {}, token).then((d) => setUsers(d.users || [])).catch(() => {}); }, [open, token]);

  const preview = useMemo(() => {
    const volume = Number(form.volume || 0), rate = Number(form.euroRate || 0), fees = Number(form.remittanceFees || 0);
    const receivedEuro = rate ? Math.max(0, (volume - fees) / rate) : 0;
    const purchasedEuro = form.usdcPurchases.reduce((s, r) => s + Number(r.volumeEuro || 0), 0);
    const usdc = form.usdcPurchases.reduce((s, r) => s + (Number(r.rateEuro) ? Number(r.volumeEuro || 0) / Number(r.rateEuro) : 0), 0);
    const soldInr = form.usdtSales.reduce((s, r) => s + (Number(r.usdtAmount || 0) * Number(r.rateInr || 0)), 0);
    const profit = soldInr - volume;
    const estoniaTax = profit > 0 ? profit * .2 : 0, indiaTax = profit > 0 ? profit * .3 : 0;
    return { receivedEuro, purchasedEuro, usdc, soldInr, profit, estoniaTax, indiaTax, netProfit: profit - estoniaTax - indiaTax };
  }, [form]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api("/arbitro", { method: "POST", body: JSON.stringify({
        ...form, volume: Number(form.volume), euroRate: Number(form.euroRate),
        remittanceFees: Number(form.remittanceFees || 0), visibleToAll: visibility === "all",
        visibleToUsers: visibility === "users" ? selectedUsers : []
      }) }, token);
      toast.success("Arbitro transaction saved"); setForm(initialForm()); setVisibility("all"); setSelectedUsers([]); onSaved();
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };

  return <Modal open={open} onClose={onClose} title="Add arbitro transaction" size="xl"
    headerSlot={<div className="flex gap-2"><Badge color="yellow">Data filling</Badge><Badge color="purple"><Sparkles className="mr-1 h-3 w-3" />Live tally</Badge></div>}>
    <form onSubmit={submit} className="arbitro-linear space-y-4">
     
      <section className="rounded-xl border border-[#d8d8da] bg-[#f1f1f2] p-4">
        <h3 className="mb-4"><span className="inline-flex rounded-lg bg-[#bfe2ff] px-3 py-1.5 text-xs font-700 text-[#245f85]">● &nbsp; INR to EUR remittance</span></h3>
        <div className="grid gap-4 md:grid-cols-2">
          <PlatformSelect label="Remittance platform" options={REMITTANCE_PLATFORMS} value={form.remittancePlatform} onChange={(value) => set("remittancePlatform", value)} />
          <Field label="Person name" value={form.personName} onChange={(e) => set("personName", e.target.value)} placeholder="Remitter's full name" />
          <StyledDatePicker label="Remitting date" value={form.date} onChange={(v) => set("date", v)} compact />
          <Field label="Remitted to bank account / platform" value={form.remittedBankPlatform} onChange={(e) => set("remittedBankPlatform", e.target.value)} placeholder="Bank or account platform" />
          <Field label="Today's EUR rate in INR" type="number" value={form.euroRate} onChange={(e) => set("euroRate", e.target.value)} placeholder="e.g. 101.25" />
          <Field label="Remitting volume (INR)" type="number" value={form.volume} onChange={(e) => set("volume", e.target.value)} placeholder="e.g. 200000" />
          <Field label="Remitting fees (INR)" type="number" value={form.remittanceFees} onChange={(e) => set("remittanceFees", e.target.value)} placeholder="e.g. 1500" required={false} />
          <Field label="Received EUR (automatic)" value={fmt(preview.receivedEuro, 2)} onChange={() => {}} readOnly />
        </div>
      </section>

      <section className="rounded-xl border border-[#d8d8da] bg-[#f1f1f2] p-4">
        <h3 className="mb-4"><span className="inline-flex rounded-lg bg-[#ddd1ff] px-3 py-1.5 text-xs font-700 text-[#684da7]">● &nbsp; Buy USDC with EUR</span></h3>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <PlatformSelect label="USDC buying platform" options={BUYING_PLATFORMS} value={form.usdcBuyingPlatform} onChange={(value) => set("usdcBuyingPlatform", value)} />
          <Field label="Bank used for buying (automatic)" value={form.remittedBankPlatform} onChange={() => {}} readOnly />
          <StyledDatePicker label="USDC buying date" value={form.usdcBuyingDate} onChange={(v) => set("usdcBuyingDate", v)} compact />
        </div>
        <RepeatableRows type="purchase" rows={form.usdcPurchases} onChange={(v) => set("usdcPurchases", v)} />
      </section>

      <section className="rounded-xl border border-[#d8d8da] bg-[#f1f1f2] p-4">
        <h3 className="mb-4"><span className="inline-flex rounded-lg bg-[#ffe09a] px-3 py-1.5 text-xs font-700 text-[#735718]">● &nbsp; Sell USDT for INR</span></h3>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Field label="USDT selling account name" value={form.usdtSellingAccountName} onChange={(e) => set("usdtSellingAccountName", e.target.value)} placeholder="Account name" />
          <StyledDatePicker label="USDT selling date" value={form.usdtSellingDate} onChange={(v) => set("usdtSellingDate", v)} compact />
        </div>
        <RepeatableRows type="sale" rows={form.usdtSales} onChange={(v) => set("usdtSales", v)} />
      </section>

      <section className="rounded-xl border border-[#d8d8da] bg-white p-4">
        <h3 className="mb-4"><span className="inline-flex rounded-lg bg-[#bfe8b4] px-3 py-1.5 text-xs font-700 text-[#315f2d]">● &nbsp; Tally & profit</span></h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["Remitted INR", fmtCurrency(Number(form.volume || 0))], ["Total USDT sold", fmtCurrency(preview.soldInr)],
            ["Gross profit", fmtCurrency(preview.profit)], ["Net profit", fmtCurrency(preview.netProfit)]].map(([l, v], i) =>
            <div key={l} className={cn("rounded-2xl border p-4", i === 3 ? preview.netProfit >= 0 ? "border-[#d5e4d1] bg-[#eaf4e7]" : "border-[#f1d6d6] bg-[#fdeaea]" : "border-[#eee6df] bg-white")}>
              <p className="text-xs text-[#8f857d]">{l}</p><p className="mt-2 text-lg font-700 text-[#201c1a]">{v}</p>
            </div>)}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#fff7e5] p-4 text-sm"><span className="text-[#8f857d]">Estonia tax · 20%</span><strong className="float-right text-[#9a7531]">−{fmtCurrency(preview.estoniaTax)}</strong></div>
          <div className="rounded-2xl bg-[#fff0f0] p-4 text-sm"><span className="text-[#8f857d]">India tax · 30%</span><strong className="float-right text-[#a24f4f]">−{fmtCurrency(preview.indiaTax)}</strong></div>
        </div>
        {preview.purchasedEuro > preview.receivedEuro + .01 && <p className="mt-3 rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-[#a24f4f]">USDC purchase volume exceeds received EUR by {fmt(preview.purchasedEuro - preview.receivedEuro, 2)} EUR.</p>}
      </section>

      <TextArea label="Notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional transaction notes…" />
      <VisibilitySelector value={visibility} onChange={setVisibility} users={users} selectedUsers={selectedUsers} onUsersChange={setSelectedUsers} />
      <div className="flex gap-3 border-t border-[#eee6df] pt-4"><Btn type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn><Btn type="submit" loading={loading} className="flex-1">Save transaction</Btn></div>
    </form>
  </Modal>;
};

const chartTooltipStyle = { border: "1px solid #dedee3", borderRadius: 10, box: "0 8px 24px rgba(0,0,0,.08)", fontSize: 12 };

function MiniTrend({ data, dataKey, color = "#826ef0" }) {
  return <div className="h-[58px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
        <defs><linearGradient id={`trend-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={.28}/><stop offset="1" stopColor={color} stopOpacity={0}/></linearGradient></defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#trend-${dataKey})`} isAnimationActive animationDuration={700} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

function TransactionChart({ record }) {
  const data = [
    { name: "Remitted", amount: Number(record.volume || 0), fill: "#a893f5" },
    { name: "Sold", amount: Number(record.totalAmountInr || 0), fill: "#60c8e8" },
    { name: "Net", amount: Number(record.netProfit || 0), fill: record.netProfit >= 0 ? "#76cc75" : "#ef8181" },
  ];
  return <div className="h-[145px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8b8c91", fontSize: 10 }} />
        <Tooltip formatter={(value) => fmtCurrency(value)} cursor={{ fill: "#f4f4f6" }} contentStyle={chartTooltipStyle} />
        <Bar dataKey="amount" radius={[6, 6, 2, 2]} isAnimationActive animationDuration={750}>{data.map((item) => <Cell key={item.name} fill={item.fill} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

function TransactionCard({ record, owner, onView, onDelete, index }) {
  const platform = [...REMITTANCE_PLATFORMS, ...BUYING_PLATFORMS].find((item) => item.value === record.remittancePlatform);
  const margin = Number(record.volume) ? (Number(record.netProfit || 0) / Number(record.volume)) * 100 : 0;
  return <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, delay: Math.min(index * .04, .24) }}
    whileHover={{ y: -3 }} onClick={onView}
    className="group cursor-pointer overflow-hidden rounded-2xl bg-white p-4 transition-colors">
    <div className="flex items-start justify-between gap-3 border-b border-[#eeeeF1] pb-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0edff]">
          {platform ? <img src={platform.logo} alt="" className="h-7 w-7 rounded-lg object-contain" /> : <span className="text-sm font-700 text-[#7563c5]">A</span>}
        </div>
        <div className="min-w-0"><h3 className="truncate text-sm font-700 text-[#303137]">{record.personName || "Legacy transaction"}</h3><p className="mt-0.5 text-xs text-[#909197]">{record.remittancePlatform || "Arbitro"} · {fmtDate(record.date)}</p></div>
      </div>
      <Badge color={record.netProfit >= 0 ? "green" : "red"}>{record.netProfit >= 0 ? "Profitable" : "Loss"}</Badge>
    </div>
    <div className="grid grid-cols-[1fr_1.1fr] items-center gap-3 pt-3">
      <div className="space-y-3">
        <div><p className="text-[10px] font-700 uppercase tracking-[.12em] text-[#a0a1a6]">Net profit</p><p className={cn("mt-1 text-xl font-700", record.netProfit >= 0 ? "text-[#3e8a4a]" : "text-[#be5151]")}>{fmtCurrency(record.netProfit)}</p><p className="mt-1 text-xs text-[#999a9f]">{margin >= 0 ? "+" : ""}{fmt(margin, 2)}% margin</p></div>
        <div className="flex items-center gap-2"><Badge color="purple">{owner(record)}</Badge><span className="text-xs text-[#999a9f]">€{fmt(record.totalReceivedEuro, 0)} received</span></div>
      </div>
      <TransactionChart record={record} />
    </div>
    <div className="mt-2 flex items-center justify-between border-t border-[#eeeeF1] pt-3">
      <div className="flex gap-3 text-xs text-[#77787e]"><span>In {fmtCurrency(record.volume)}</span><span>Out {fmtCurrency(record.totalAmountInr)}</span></div>
      <div className="flex gap-1 opacity-60 transition group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onView(); }} className="rounded-lg p-2 hover:bg-[#efeff2]" title="View"><Eye className="h-4 w-4" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-lg p-2 text-[#b95a5a] hover:bg-[#fff0f0]" title="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  </motion.article>;
}

export default function ArbitroPage({ token }) {
  const [records, setRecords] = useState([]), [loading, setLoading] = useState(true), [showModal, setShowModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null), [deleteRecord, setDeleteRecord] = useState(null), [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1), [totalPages, setTotalPages] = useState(1), [filter, setFilter] = useState({ startDate: "", endDate: "" });
  const loadRecords = useCallback(async (p = 1) => { setLoading(true); try {
    const q = new URLSearchParams({ page: String(p), limit: "15" }); if (filter.startDate) q.set("startDate", filter.startDate); if (filter.endDate) q.set("endDate", filter.endDate);
    const d = await api(`/arbitro?${q}`, {}, token); setRecords(d.records || []); setTotalPages(d.totalPages || 1); setPage(p);
  } catch { toast.error("Failed to load arbitro records"); } finally { setLoading(false); } }, [token, filter]);
  useEffect(() => { loadRecords(1); }, [loadRecords]);
  const owner = (r) => r.userId?.name || "You";
  const remove = async () => { setDeleting(true); try { await api(`/arbitro/${deleteRecord._id}`, { method: "DELETE" }, token); toast.success("Record deleted"); setDeleteRecord(null); loadRecords(page); } catch (e) { toast.error(e.message); } finally { setDeleting(false); } };
  const analytics = useMemo(() => {
    const totals = records.reduce((sum, record) => ({
      volume: sum.volume + Number(record.volume || 0), sold: sum.sold + Number(record.totalAmountInr || 0),
      profit: sum.profit + Number(record.netProfit || 0)
    }), { volume: 0, sold: 0, profit: 0 });
    const trend = [...records].reverse().map((record, index) => ({
      index, volume: Number(record.volume || 0), sold: Number(record.totalAmountInr || 0),
      profit: Number(record.netProfit || 0), count: index + 1
    }));
    return { ...totals, trend };
  }, [records]);

  return <div className="arbitro-linear mx-auto max-w-7xl space-y-4 overflow-visible">
    <SectionTitle title="Arbitro" subtitle="Capture the complete INR → EUR → USDC → USDT → INR transaction journey."
      action={<Btn onClick={() => setShowModal(true)} className="gap-2"><Plus className="h-4 w-4" />Add transaction</Btn>} />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Transactions", value: records.length, detail: "on this page", key: "count", color: "#826ef0", icon: "▦" },
        { label: "Remitted volume", value: fmtCurrency(analytics.volume), detail: "total INR deployed", key: "volume", color: "#a57cf2", icon: "↗" },
        { label: "USDT sold", value: fmtCurrency(analytics.sold), detail: "total INR received", key: "sold", color: "#53bbdb", icon: "◎" },
        { label: "Net profit", value: fmtCurrency(analytics.profit), detail: analytics.profit >= 0 ? "after combined taxes" : "current loss", key: "profit", color: analytics.profit >= 0 ? "#64bd6a" : "#df6b6b", icon: "⌁" },
      ].map((card, index) => <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }}
        className="rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between border-b border-[#efeff1] pb-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0edff] text-sm text-[#7461ca]">{card.icon}</span><p className="text-sm font-700 text-[#45464c]">{card.label}</p></div><span className="text-xs text-[#aaaab0]">•••</span></div>
        <div className="flex items-end justify-between gap-3 pt-3"><div className="min-w-0"><p className="truncate text-xl font-700 text-[#292a2f]">{card.value}</p><p className="mt-1 text-xs text-[#98999e]">{card.detail}</p></div><div className="w-[42%]"><MiniTrend data={analytics.trend} dataKey={card.key} color={card.color} /></div></div>
      </motion.div>)}
    </div>

    <div className="rounded-2xl bg-white p-3"><div className="grid gap-3 md:grid-cols-3">
      <StyledDatePicker label="Start date" value={filter.startDate} onChange={(v) => setFilter((f) => ({ ...f, startDate: v }))} compact />
      <StyledDatePicker label="End date" value={filter.endDate} onChange={(v) => setFilter((f) => ({ ...f, endDate: v }))} compact />
      <div className="flex items-end gap-2"><Btn onClick={() => loadRecords(1)} className="flex-1 gap-2"><Filter className="h-4 w-4" />Filter</Btn><Btn variant="secondary" onClick={() => setFilter({ startDate: "", endDate: "" })}>Clear</Btn></div>
    </div></div>

    <div className="flex items-center justify-between px-1"><div><h2 className="text-base font-700 text-[#34353a]">Transaction analysis</h2><p className="mt-0.5 text-xs text-[#929398]">Every card includes its own remittance, sale and profit chart.</p></div><Badge color="purple">{records.length} records</Badge></div>
    {loading ? <div className="flex justify-center rounded-2xl border border-[#d2d2d5] bg-white p-12"><Spinner className="h-6 w-6" /></div> : !records.length ? <div className="rounded-2xl border border-[#d2d2d5] bg-white p-12 text-center text-sm text-[#8f857d]">No transactions yet.</div> : <div className="grid gap-4 lg:grid-cols-2">
      {records.map((record, index) => <TransactionCard key={record._id} record={record} owner={owner} index={index} onView={() => setViewRecord(record)} onDelete={() => setDeleteRecord(record)} />)}
    </div>}
    {totalPages > 1 && <div className="flex justify-center gap-2 rounded-xl border border-[#d2d2d5] bg-white p-3"><Btn variant="outline" disabled={page === 1} onClick={() => loadRecords(page - 1)}><ChevronLeft className="h-4 w-4" /></Btn><span className="py-2 text-sm">Page {page} of {totalPages}</span><Btn variant="outline" disabled={page === totalPages} onClick={() => loadRecords(page + 1)}><ChevronRight className="h-4 w-4" /></Btn></div>}
    <ArbitroModal open={showModal} onClose={() => setShowModal(false)} token={token} onSaved={() => { setShowModal(false); loadRecords(1); }} />
    <Modal open={!!viewRecord} onClose={() => setViewRecord(null)} title="Arbitro transaction details" size="xl">
      {viewRecord && <div className="space-y-5">
        <div className="grid gap-4 rounded-2xl border border-[#dedee2] bg-white p-4 md:grid-cols-[1fr_1.5fr]">
          <div><Badge color={viewRecord.netProfit >= 0 ? "green" : "red"}>{viewRecord.netProfit >= 0 ? "Profitable transaction" : "Transaction loss"}</Badge><p className="mt-4 text-xs font-700 uppercase tracking-[.12em] text-[#9a9ba0]">Net result</p><p className={cn("mt-1 text-3xl font-700", viewRecord.netProfit >= 0 ? "text-[#3e8a4a]" : "text-[#be5151]")}>{fmtCurrency(viewRecord.netProfit)}</p><p className="mt-2 text-sm text-[#88898f]">Remitted versus sold INR and final profit.</p></div>
          <TransactionChart record={viewRecord} />
        </div>
        <DetailGrid columns={4} items={[
          { label: "Person", value: viewRecord.personName || "—" }, { label: "Remittance platform", value: viewRecord.remittancePlatform || "—" },
          { label: "Remitting date", value: fmtDate(viewRecord.date) }, { label: "Bank / platform", value: viewRecord.remittedBankPlatform || "—" },
          { label: "EUR rate", value: fmt(viewRecord.euroRate) }, { label: "Remitted INR", value: fmtCurrency(viewRecord.volume) },
          { label: "Fees INR", value: fmtCurrency(viewRecord.remittanceFees) }, { label: "Received EUR", value: fmt(viewRecord.totalReceivedEuro, 2), tone: "feature" },
          { label: "USDC platform", value: viewRecord.usdcBuyingPlatform || "—" }, { label: "Bank used", value: viewRecord.bankUsedForBuying || "—" },
          { label: "USDT selling account", value: viewRecord.usdtSellingAccountName || "—" }, { label: "Total sold INR", value: fmtCurrency(viewRecord.totalAmountInr), tone: "feature" }
        ]} />
        {!!viewRecord.usdcPurchases?.length && <div><h4 className="mb-3 text-sm font-700 uppercase tracking-[.12em] text-[#9b9188]">USDC purchases</h4><div className="grid gap-3 md:grid-cols-2">{viewRecord.usdcPurchases.map((x, i) => <div key={i} className="rounded-2xl border bg-white p-4 text-sm"><strong>{x.sellerName}</strong><p className="mt-2 text-[#746b64]">€{fmt(x.volumeEuro,2)} at €{fmt(x.rateEuro,4)} · {fmt(x.usdcAmount,2)} USDC</p></div>)}</div></div>}
        {!!viewRecord.usdtSales?.length && <div><h4 className="mb-3 text-sm font-700 uppercase tracking-[.12em] text-[#9b9188]">USDT sales</h4><div className="grid gap-3 md:grid-cols-2">{viewRecord.usdtSales.map((x, i) => <div key={i} className="rounded-2xl border bg-white p-4 text-sm"><strong>{x.buyerName}</strong><p className="mt-2 text-[#746b64]">{fmtCurrency(x.volumeInr)} at ₹{fmt(x.rateInr,2)} · {fmt(x.usdtAmount,2)} USDT</p></div>)}</div></div>}
        <DetailGrid items={[{ label: "Gross profit", value: fmtCurrency(viewRecord.profitBeforeTax), tone: viewRecord.profitBeforeTax >= 0 ? "success" : "danger" }, { label: "Estonia tax 20%", value: `−${fmtCurrency(viewRecord.estoniaTax)}`, tone: "warning" }, { label: "India tax 30%", value: `−${fmtCurrency(viewRecord.indiaTax)}`, tone: "danger" }, { label: "Net profit", value: fmtCurrency(viewRecord.netProfit), tone: viewRecord.netProfit >= 0 ? "success" : "danger" }]} />
        {viewRecord.notes && <div className="rounded-2xl border bg-white p-4 text-sm">{viewRecord.notes}</div>}
      </div>}
    </Modal>
    <ConfirmModal open={!!deleteRecord} onClose={() => setDeleteRecord(null)} onConfirm={remove} loading={deleting} title="Delete arbitro transaction?" description="This permanently removes the transaction and its full tally." confirmText="Delete" confirmVariant="danger" />
  </div>;
}
