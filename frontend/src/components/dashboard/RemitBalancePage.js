"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CalendarClock, Eye, Pencil, Plus, Trash2, Users, WalletCards } from "lucide-react";
import { api } from "@/lib/api";
import { cn, fmtCurrency, fmtDate } from "@/lib/utils";
import { REMITTANCE_PLATFORMS, platformMeta } from "@/lib/remittance";
import { Badge, Btn, ConfirmModal, Modal, SectionTitle, Spinner } from "../ui/SharedComponents";
import FloatingSelect from "../ui/FloatingSelect";

const inputClass = "w-full rounded-lg border border-[#d5d5d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8a9fe8] focus:ring-2 focus:ring-[#9baded]/20";
const emptyForm = (person) => person
  ? ({ name: person.name, platformCount: person.platforms.length, platforms: [...person.platforms] })
  : ({ name: "", platformCount: 1, platforms: [REMITTANCE_PLATFORMS[0].value] });

function UsagePie({ used, remaining, size = 132 }) {
  const data = used || remaining ? [{ name: "Used", value: used }, { name: "Remaining", value: remaining }] : [{ name: "Available", value: 1 }];
  return <div style={{ height: size, width: size }} className="relative shrink-0">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart><Pie data={data} dataKey="value" innerRadius="64%" outerRadius="88%" startAngle={90} endAngle={-270} stroke="none">
        {data.map((item, index) => <Cell key={item.name} fill={data.length === 1 ? "#eceaf8" : index === 0 ? "#806be3" : "#e7e5ef"} />)}
      </Pie><Tooltip formatter={(value) => fmtCurrency(value)} /></PieChart>
    </ResponsiveContainer>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-sm text-[#34343a]">{used + remaining ? Math.round((remaining / (used + remaining)) * 100) : 100}%</strong><span className="text-[10px] text-[#929398]">left</span></div>
  </div>;
}

function PersonAllowanceCard({ person, index, fiscalYear, onView, onEdit, onDelete }) {
  const totals = person.platformBalances.reduce((sum, item) => ({ used: sum.used + item.used, remaining: sum.remaining + item.remaining, limit: sum.limit + item.limit }), { used: 0, remaining: 0, limit: 0 });
  const usedPercent = totals.limit ? Math.min(100, (totals.used / totals.limit) * 100) : 0;
  const available = totals.remaining > 0;
  return <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .04, .24) }} whileHover={{ y: -3 }}
    className="group overflow-hidden rounded-2xl border border-[#dedfe5] bg-white shadow-[0_10px_30px_rgba(48,43,70,.06)] transition-shadow hover:shadow-[0_16px_38px_rgba(48,43,70,.1)]">
    <button type="button" onClick={onView} className="block w-full text-left">
      <div className="relative overflow-hidden border-b border-[#e6e3f2] bg-gradient-to-br from-[#f4f1ff] via-[#faf9ff] to-[#eef4ff] px-5 py-4">
        <span className="absolute -right-7 -top-10 h-28 w-28 rounded-full border-[20px] border-[#8170df]/5" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6758c6] to-[#8c78e5] text-base font-700 text-white shadow-[0_6px_14px_rgba(103,88,198,.24)]">{person.name.trim().charAt(0).toUpperCase()}</span><div className="min-w-0"><h3 className="truncate text-lg font-700 text-[#303137]">{person.name}</h3><p className="mt-0.5 text-xs text-[#85868e]">{person.platforms.length} platform{person.platforms.length === 1 ? "" : "s"} · FY {fiscalYear}</p></div></div>
          <span className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-700", available ? "bg-[#dff3d8] text-[#34743d]" : "bg-[#fde3e3] text-[#b74850]")}>{available ? "Available" : "Limit reached"}</span>
        </div>
      </div>
      <div className="grid items-center gap-4 p-5 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-[10px] font-700 uppercase tracking-[.13em] text-[#9b9ca3]">Total remaining</p>
          <p className={cn("mt-1.5 text-3xl font-700 tracking-[-.02em]", available ? "text-[#347544]" : "text-[#b84d55]")}>{fmtCurrency(totals.remaining)}</p>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs"><span className="font-600 text-[#696a72]">Overall allowance used</span><span className="font-700 text-[#6657bd]">{usedPercent.toFixed(1)}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#ebeaf0]"><motion.div initial={{ width: 0 }} animate={{ width: `${usedPercent}%` }} transition={{ duration: .7 }} className="h-full rounded-full bg-gradient-to-r from-[#7464db] to-[#9a7cf2]" /></div>
            <div className="mt-2 flex justify-between text-xs text-[#92939a]"><span>{fmtCurrency(totals.used)} used</span><span>{fmtCurrency(totals.limit)} limit</span></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{person.platformBalances.map((balance) => { const meta = platformMeta(balance.platform); const left = balance.limit ? Math.round((balance.remaining / balance.limit) * 100) : 0; return <span key={balance.platform} className="inline-flex items-center gap-2 rounded-xl border border-[#e6e4eb] bg-[#f8f7fa] px-2.5 py-1.5 text-xs text-[#5f6067]"><Image src={meta?.logo} alt="" width={18} height={18} className="h-[18px] w-[18px] rounded object-contain" /><span className="font-600">{balance.platform}</span><span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-700 text-[#7463c8]">{left}% left</span></span>; })}</div>
        </div>
        <UsagePie used={totals.used} remaining={totals.remaining} size={116} />
      </div>
    </button>
    <div className="flex items-center justify-between border-t border-[#ededf0] bg-[#fbfbfc] px-4 py-2.5"><p className="text-xs text-[#97989e]">Added {fmtDate(person.createdAt)}</p><div className="flex items-center gap-1"><button type="button" onClick={onView} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-600 text-[#62636a] hover:bg-[#eeeef2]"><Eye className="h-4 w-4" />View</button><button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-600 text-[#6556b9] hover:bg-[#eeeaff]"><Pencil className="h-4 w-4" />Edit</button><button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-600 text-[#b65359] hover:bg-[#fff0f0]"><Trash2 className="h-4 w-4" />Delete</button></div></div>
  </motion.article>;
}

function PlatformBalanceCard({ balance, resetsAt }) {
  const meta = platformMeta(balance.platform);
  const usedPercent = balance.limit ? Math.min(100, (balance.used / balance.limit) * 100) : 0;
  const remainingPercent = Math.max(0, 100 - usedPercent);
  const accent = usedPercent >= 90 ? "from-[#e65f68] to-[#f09672]" : usedPercent >= 70 ? "from-[#e6a54d] to-[#e8c35f]" : "from-[#7565df] to-[#9a7cf2]";
  return <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-[#e1e2e7] bg-white shadow-[0_10px_30px_rgba(51,45,78,.06)]">
    <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-[#f5f2ff] via-white to-[#f5f8ff]" />
    <div className="relative p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white bg-white shadow-sm"><Image src={meta?.logo} alt="" width={38} height={38} className="h-9 w-9 rounded-xl object-contain" /></span><div><h4 className="text-base font-700 text-[#282930]">{balance.platform}</h4><p className="mt-0.5 text-xs text-[#92939a]">{balance.transactions} linked transaction{balance.transactions === 1 ? "" : "s"}</p></div></div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-700", usedPercent >= 90 ? "bg-[#fde9e9] text-[#b94750]" : "bg-[#ece9ff] text-[#6253b9]")}>{remainingPercent.toFixed(0)}% left</span>
      </div>
      <div className="mt-6">
        <div className="mb-2 flex items-end justify-between"><div><p className="text-[10px] font-700 uppercase tracking-[.13em] text-[#999aa1]">Annual usage</p><p className="mt-1 text-sm font-700 text-[#4b4c54]">{fmtCurrency(balance.used)} used</p></div><p className="text-right text-xs text-[#85868d]">of {fmtCurrency(balance.limit)}</p></div>
        <div className="relative h-3 overflow-hidden rounded-full bg-[#ecebf1] shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${usedPercent}%` }} transition={{ duration: .7, ease: "easeOut" }} className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_12px_rgba(117,101,223,.3)]", accent)} /></div>
        <div className="mt-2 flex justify-between text-[11px] text-[#9a9ba1]"><span>₹0</span><span>{usedPercent.toFixed(1)}% consumed</span><span>{fmtCurrency(balance.limit)}</span></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#dcebd8] bg-[#eff8ed] p-3"><p className="text-[10px] font-700 uppercase tracking-[.1em] text-[#71826d]">Remaining</p><p className="mt-1.5 text-lg font-700 text-[#397145]">{fmtCurrency(balance.remaining)}</p></div>
        <div className="rounded-xl border border-[#eee5d3] bg-[#fff8ea] p-3"><p className="text-[10px] font-700 uppercase tracking-[.1em] text-[#927f5d]">Used</p><p className="mt-1.5 text-lg font-700 text-[#9a6b25]">{fmtCurrency(balance.used)}</p></div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f6f6f8] px-3 py-2.5 text-xs text-[#777980]"><CalendarClock className="h-4 w-4 text-[#7565cf]" /><span>Resets on <strong className="text-[#4f5057]">{fmtDate(resetsAt)}</strong></span></div>
    </div>
  </motion.article>;
}

function AddPersonModal({ open, onClose, token, onSaved, person = null }) {
  const [form, setForm] = useState(() => emptyForm(person));
  const [loading, setLoading] = useState(false);
  const maxPlatforms = Math.min(6, REMITTANCE_PLATFORMS.length);
  const setCount = (count) => {
    const next = [...form.platforms].slice(0, count);
    for (const platform of REMITTANCE_PLATFORMS) {
      if (next.length >= count) break;
      if (!next.includes(platform.value)) next.push(platform.value);
    }
    setForm((current) => ({ ...current, platformCount: count, platforms: next }));
  };
  const setPlatform = (index, value) => setForm((current) => ({ ...current, platforms: current.platforms.map((item, i) => i === index ? value : item) }));
  const submit = async (event) => {
    event.preventDefault();
    if (new Set(form.platforms).size !== form.platforms.length) return toast.error("Each platform can only be selected once");
    setLoading(true);
    try {
      await api(person ? `/remit-balance/${person._id}` : "/remit-balance", { method: person ? "PUT" : "POST", body: JSON.stringify(form) }, token);
      toast.success(person ? "RemitBalance person updated" : "Person added to RemitBalance"); onSaved();
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };
  return <Modal open={open} onClose={onClose} title={person ? "Edit RemitBalance person" : "Add RemitBalance person"} size="lg">
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2"><label className="text-sm font-600 text-[#5c554f]">Person name</label><input className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full legal name" required /></div>
      <div><FloatingSelect label="Number of remittance platforms" value={form.platformCount} onChange={(value) => setCount(Number(value))}
        options={Array.from({ length: maxPlatforms }, (_, index) => ({ value: index + 1, label: `${index + 1}`, description: `${index + 1} unique platform${index ? "s" : ""}` }))} />
        <p className="mt-2 text-xs text-[#8b8c91]">Up to 6 unique platforms are supported; {REMITTANCE_PLATFORMS.length} are currently configured.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{form.platforms.map((value, index) => <FloatingSelect key={index} label={`Platform ${index + 1}`} compactLabel value={value} onChange={(nextValue) => setPlatform(index, nextValue)}
        options={REMITTANCE_PLATFORMS.map((platform) => ({ value: platform.value, label: platform.value, logo: platform.logo, description: `${fmtCurrency(platform.limit)} yearly limit`, disabled: form.platforms.some((selected, selectedIndex) => selectedIndex !== index && selected === platform.value) }))} />)}</div>
      <div className="rounded-xl bg-[#f4f2fc] px-4 py-3 text-sm text-[#62568f]">Western Union receives an ₹8L yearly allowance. Every other selected platform receives ₹10L.</div>
      <div className="flex gap-3 border-t pt-4"><Btn type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn><Btn type="submit" loading={loading} className="flex-1">{person ? "Save changes" : "Add person"}</Btn></div>
    </form>
  </Modal>;
}

export default function RemitBalancePage({ token }) {
  const [data, setData] = useState({ people: [], stats: {}, fiscalYear: "", resetsAt: null });
  const [loading, setLoading] = useState(true), [showAdd, setShowAdd] = useState(false), [viewPerson, setViewPerson] = useState(null), [editPerson, setEditPerson] = useState(null), [deletePerson, setDeletePerson] = useState(null), [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setData(await api("/remit-balance", {}, token)); } catch (err) { toast.error(err.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, [load]);
  const remove = async () => { setDeleting(true); try { await api(`/remit-balance/${deletePerson._id}`, { method: "DELETE" }, token); toast.success("Person removed"); setDeletePerson(null); load(); } catch (err) { toast.error(err.message); } finally { setDeleting(false); } };
  const summary = data.stats || {};
  const cards = [
    { label: "People", value: summary.people || 0, detail: "registered remitters", icon: <Users className="h-4 w-4" /> },
    { label: "Total allowance", value: fmtCurrency(summary.limit || 0), detail: `FY ${data.fiscalYear || "—"}`, icon: <WalletCards className="h-4 w-4" /> },
    { label: "Remitted volume", value: fmtCurrency(summary.used || 0), detail: "linked from Arbitro", icon: "↗" },
    { label: "Remaining balance", value: fmtCurrency(summary.remaining || 0), detail: data.resetsAt ? `resets ${fmtDate(data.resetsAt)}` : "resets every 1 April", icon: "◔" },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <SectionTitle title="RemitBalance" subtitle="Track each person’s annual remittance allowance by platform, resetting every 1 April." action={<Btn onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add person</Btn>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card, index) => <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} className="rounded-2xl bg-white p-4"><div className="flex items-center gap-2 text-sm font-700 text-[#55565c]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0edff] text-[#7461ca]">{card.icon}</span>{card.label}</div><p className="mt-4 text-2xl font-700 text-[#292a2f]">{card.value}</p><p className="mt-1 text-xs text-[#98999e]">{card.detail}</p></motion.div>)}</div>
    <div className="flex items-center justify-between px-1"><div><h2 className="font-700 text-[#34353a]">People and allowances</h2><p className="mt-1 text-xs text-[#929398]">Balances update automatically whenever a linked Arbitro transaction is added or removed.</p></div><Badge color="purple">FY {data.fiscalYear || "—"}</Badge></div>
    {loading ? <div className="flex justify-center rounded-2xl bg-white p-14"><Spinner className="h-7 w-7" /></div> : !data.people?.length ? <div className="rounded-2xl bg-white p-14 text-center"><Users className="mx-auto h-9 w-9 text-[#aaa4bd]" /><h3 className="mt-3 font-700">No RemitBalance people yet</h3><p className="mt-1 text-sm text-[#8b8c91]">Add a person before creating a new Arbitro remittance.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{data.people.map((person, index) => <PersonAllowanceCard key={person._id} person={person} index={index} fiscalYear={data.fiscalYear} onView={() => setViewPerson(person)} onEdit={() => setEditPerson(person)} onDelete={() => setDeletePerson(person)} />)}</div>}
    <AddPersonModal key={showAdd ? "add-open" : "add-closed"} open={showAdd} onClose={() => setShowAdd(false)} token={token} onSaved={() => { setShowAdd(false); load(); }} />
    <Modal open={!!viewPerson} onClose={() => setViewPerson(null)} title="Remittance balance details" size="xl">{viewPerson && <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#342c61] via-[#51458a] to-[#7565c9] p-5 text-white shadow-[0_12px_30px_rgba(71,59,126,.2)]">
        <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full border-[24px] border-white/5" />
        <div className="relative flex items-start justify-between gap-4"><div><span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-700">FY {data.fiscalYear}</span><h3 className="mt-3 text-2xl font-700">{viewPerson.name}</h3><p className="mt-1 flex items-center gap-2 text-sm text-white/70"><CalendarClock className="h-4 w-4" />Annual limits reset on {fmtDate(data.resetsAt)}</p></div><Btn type="button" variant="secondary" onClick={() => { setEditPerson(viewPerson); setViewPerson(null); }} className="relative gap-2 border-white/20 bg-white/95"><Pencil className="h-4 w-4" />Edit person</Btn></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{viewPerson.platformBalances.map((balance) => <PlatformBalanceCard key={balance.platform} balance={balance} resetsAt={data.resetsAt} />)}</div>
    </div>}</Modal>
    <AddPersonModal key={editPerson?._id || "no-edit"} open={!!editPerson} person={editPerson} onClose={() => setEditPerson(null)} token={token} onSaved={() => { setEditPerson(null); load(); }} />
    <ConfirmModal open={!!deletePerson} onClose={() => setDeletePerson(null)} onConfirm={remove} loading={deleting} title="Delete this person?" description="A person can only be deleted when they have no linked Arbitro transactions." confirmText="Delete" confirmVariant="danger" />
  </div>;
}
