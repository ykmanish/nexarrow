import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { fmt, fmtCurrency, fmtDate, cn, formatDateInput } from "@/lib/utils";
import {
  SectionTitle, Btn, Plus, Filter, StyledDatePicker, Spinner, Badge,
  Eye, Trash2, ChevronLeft, ChevronRight, Modal, TextArea,
  ConfirmModal, DetailGrid, Sparkles, VisibilitySelector
} from "../ui/SharedComponents";

const ArbitroModal = ({ open, onClose, token, onSaved }) => {
  const [form, setForm] = useState({
    date: formatDateInput(new Date()),
    volume: "",
    euroRate: "",
    remittanceFees: "",
    usdtPurchaseRateEuro: "",
    usdtSellingRateInr: "",
    notes: ""
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (open) loadUsers();
  }, [open]);

  const loadUsers = async () => {
    try {
      const data = await api("/users", {}, token);
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  useEffect(() => {
    const { volume, euroRate, remittanceFees, usdtPurchaseRateEuro, usdtSellingRateInr } = form;

    if (volume && euroRate && usdtPurchaseRateEuro && usdtSellingRateInr) {
      const vol = Number(volume);
      const eurRate = Number(euroRate);
      const remFeesInr = Number(remittanceFees || 0);
      const usdtBuyEur = Number(usdtPurchaseRateEuro);
      const usdtSellInr = Number(usdtSellingRateInr);

      const totalEuro = vol / eurRate;
      const remFeesEuro = remFeesInr / eurRate;
      const euroAfterFees = totalEuro - remFeesEuro;
      const usdtReceived = euroAfterFees / usdtBuyEur;
      const totalAmountInr = usdtReceived * usdtSellInr;
      const profitBeforeTax = totalAmountInr - vol;
      const estoniaTax = profitBeforeTax > 0 ? profitBeforeTax * 0.2 : 0;
      const indiaTax = profitBeforeTax > 0 ? profitBeforeTax * 0.3 : 0;
      const netProfit = profitBeforeTax > 0 ? profitBeforeTax - estoniaTax - indiaTax : profitBeforeTax;

      setPreview({
        totalEuro,
        remFeesEuro,
        euroAfterFees,
        usdtReceived,
        totalAmountInr,
        profitBeforeTax,
        estoniaTax,
        indiaTax,
        netProfit
      });
    } else {
      setPreview(null);
    }
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        ...form,
        volume: Number(form.volume),
        euroRate: Number(form.euroRate),
        remittanceFees: Number(form.remittanceFees) || 0,
        usdtPurchaseRateEuro: Number(form.usdtPurchaseRateEuro),
        usdtSellingRateInr: Number(form.usdtSellingRateInr),
        visibleToAll: visibility === "all",
        visibleToUsers: visibility === "users" ? selectedUsers : [],
      };

      await api("/arbitro", { method: "POST", body: JSON.stringify(body) }, token);
      toast.success("Arbitro entry added!");
      onSaved();

      setForm({
        date: formatDateInput(new Date()),
        volume: "",
        euroRate: "",
        remittanceFees: "",
        usdtPurchaseRateEuro: "",
        usdtSellingRateInr: "",
        notes: ""
      });
      setVisibility("all");
      setSelectedUsers([]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fld = (key, label, placeholder) => (
    <div className="space-y-2">
      <label className="block text-sm font-600 text-[#5c554f]">{label}</label>
      <input
        type="number"
        step="any"
        min="0"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-2xl border border-[#e8e0d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cfc3b8]"
        required={key !== "remittanceFees"}
      />
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add arbitro entry"
      size="xl"
      headerSlot={
        <div className="flex items-center gap-2">
          <Badge color="yellow">Arbitrage log</Badge>
          <Badge color="purple">
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />Live preview</span>
          </Badge>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[26px] border-[#ebe3db] bg-[#f8f4ef] p-4">
            <div className="mb-4">
              <h3 className="text-sm font-700 uppercase tracking-[0.12em] text-[#8f857d]">Transaction inputs</h3>
              <p className="mt-1 text-sm text-[#8f857d]">Enter the core values for the arbitro calculation.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StyledDatePicker label="Date" value={form.date} onChange={(next) => setForm((f) => ({ ...f, date: next }))} compact />
              {fld("volume", "Volume INR", "e.g. 200000")}
              {fld("euroRate", "Euro rate", "e.g. 110.8")}
              {fld("remittanceFees", "Remittance fees INR", "e.g. 3350")}
              {fld("usdtPurchaseRateEuro", "USDT buy rate", "e.g. 0.861")}
              {fld("usdtSellingRateInr", "USDT sell rate", "e.g. 102.5")}
            </div>

            <div className="mt-4">
              <TextArea
                label="Notes"
                rows={2}
                placeholder="Optional notes about this entry..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="mt-4">
              <VisibilitySelector
                value={visibility}
                onChange={setVisibility}
                users={users}
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
              />
            </div>
          </div>

          <div className="rounded-[26px] border-[#ebe3db] bg-[#fcfaf7] p-4">
            <div className="mb-4">
              <h3 className="text-sm font-700 uppercase tracking-[0.12em] text-[#8f857d]">Quick preview</h3>
              <p className="mt-1 text-sm text-[#8f857d]">Compact live summary before saving.</p>
            </div>

            {!preview ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-[22px] border border-dashed border-[#ddd2c8] bg-white px-6 text-center text-sm text-[#9a9088]">
                Fill the fields to see a live preview.
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  ["Total EURO", fmt(preview.totalEuro, 2)],
                  ["Fees in EURO", fmt(preview.remFeesEuro, 2)],
                  ["EURO after fees", fmt(preview.euroAfterFees, 2)],
                  ["USDT received", `${fmt(preview.usdtReceived, 2)} USDT`],
                  ["Total INR", fmtCurrency(preview.totalAmountInr)],
                  ["Net profit", fmtCurrency(preview.netProfit)]
                ].map(([label, value], i) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3 text-sm",
                      i === 4 ? "bg-[#f7f2ec] border border-[#e8ddd3]" :
                      i === 5 ? preview.netProfit >= 0 ? "bg-[#e8f3e5] border border-[#d8e7d4]" : "bg-[#fdeaea] border border-[#f1d6d6]" :
                      "bg-white border border-[#eee6df]"
                    )}
                  >
                    <span className="text-[#7d736c]">{label}</span>
                    <span className="font-700 text-[#201c1a]">{value}</span>
                  </div>
                ))}

                <div className="mt-3 rounded-2xl border border-[#eee6df] bg-white p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8f857d]">Estonia tax</span>
                    <span className="font-600 text-[#9a7531]">-{fmtCurrency(preview.estoniaTax)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-[#8f857d]">India tax</span>
                    <span className="font-600 text-[#a24f4f]">-{fmtCurrency(preview.indiaTax)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#eee6df] pt-4">
          <Btn type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
          <Btn type="submit" loading={loading} className="flex-1">Save entry</Btn>
        </div>
      </form>
    </Modal>
  );
};

export default function ArbitroPage({ token }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ startDate: "", endDate: "" });

  const loadRecords = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: "15" });
      if (filter.startDate) params.append("startDate", filter.startDate);
      if (filter.endDate) params.append("endDate", filter.endDate);

      const data = await api(`/arbitro?${params.toString()}`, {}, token);
      setRecords(data.records || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch {
      toast.error("Failed to load arbitro records");
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    loadRecords(1);
  }, [loadRecords]);

  const handleDeleteConfirm = async () => {
    if (!deleteRecord) return;
    setDeleting(true);
    try {
      await api(`/arbitro/${deleteRecord._id || deleteRecord.id}`, { method: "DELETE" }, token);
      toast.success("Record deleted");
      setDeleteRecord(null);
      loadRecords(page);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const totals = {
    volume: records.reduce((s, r) => s + Number(r.volume || 0), 0),
    inr: records.reduce((s, r) => s + Number(r.totalAmountInr || 0), 0),
    profit: records.reduce((s, r) => s + Number(r.netProfit || 0), 0)
  };

  const getOwnerLabel = (record) => {
    if (record.userId?._id === record.userId) return "You";
    return record.userId?.name || "Unknown";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 overflow-visible">
      <SectionTitle
        title="Arbitro"
        subtitle="Track daily arbitrage transactions and profits. View entries shared by others."
        action={<Btn onClick={() => setShowModal(true)} className="gap-2"><Plus className="h-4 w-4" />Add entry</Btn>}
      />

      {/* <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[30px] border-[#ebe3db] bg-[#fcfaf7] p-5">
          <p className="text-xs font-700 uppercase tracking-[0.12em] text-[#988d85]">Total entries</p>
          <p className="mt-3 text-2xl font-700 font-semibold small text-[#201c1a]">{records.length}</p>
        </div>
        <div className="rounded-[30px] border-[#ebe3db] bg-[#fcfaf7] p-5">
          <p className="text-xs font-700 uppercase tracking-[0.12em] text-[#988d85]">Total volume</p>
          <p className="mt-3 text-2xl font-700 font-semibold small text-[#201c1a]">{fmtCurrency(totals.volume)}</p>
        </div>
        <div className="rounded-[30px] border-[#ebe3db] bg-[#fcfaf7] p-5">
          <p className="text-xs font-700 uppercase tracking-[0.12em] text-[#988d85]">Total INR amount</p>
          <p className="mt-3 text-2xl font-700 font-semibold small text-[#201c1a]">{fmtCurrency(totals.inr)}</p>
        </div>
        <div className="rounded-[30px] border-[#ebe3db] bg-[#fcfaf7] p-5">
          <p className="text-xs font-700 uppercase tracking-[0.12em] text-[#988d85]">Net profit after tax</p>
          <p className={cn("mt-3 text-2xl font-700 font-semibold small", totals.profit >= 0 ? "text-[#5d7b58]" : "text-[#b85555]")}>{fmtCurrency(totals.profit)}</p>
        </div>
      </div> */}

      <div className="overflow-visible rounded-[32px] border-[#ebe3db] bg-[#fcfaf7] p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-3 overflow-visible">
          <StyledDatePicker
            label="Start date"
            value={filter.startDate}
            onChange={(next) => setFilter((f) => ({ ...f, startDate: next }))}
            compact
          />
          <StyledDatePicker
            label="End date"
            value={filter.endDate}
            onChange={(next) => setFilter((f) => ({ ...f, endDate: next }))}
            compact
          />
          <div className="grid gap-4">
            <div className="invisible text-xs font-700 uppercase tracking-[0.12em]">x</div>
            <div className="flex gap-2">
              <Btn onClick={() => loadRecords(1)} className="flex-1 gap-2"><Filter className="h-4 w-4" />Filter</Btn>
              <Btn
                variant="secondary"
                onClick={() => {
                  setFilter({ startDate: "", endDate: "" });
                  setTimeout(() => loadRecords(1), 0);
                }}
              >
                Clear
              </Btn>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-visible rounded-[30px] border-[#ebe3db] bg-[#fcfaf7]">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Spinner className="h-6 w-6 text-[#7e756e]" /></div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#8f857d]">No arbitro entries yet. Add your first entry.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0e9e2] text-left text-xs font-700 uppercase tracking-[0.12em] text-[#9d938b]">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                  <th className="px-4 py-3 text-right">Euro rate</th>
                  <th className="px-4 py-3 text-right">Rem. fees</th>
                  <th className="px-4 py-3 text-right">After fees</th>
                  <th className="px-4 py-3 text-right">USDT</th>
                  <th className="px-4 py-3 text-right">Total INR</th>
                  <th className="px-4 py-3 text-right">Net profit</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec._id || rec.id} className="border-b border-[#f5efe9] last:border-b-0 hover:bg-[#faf7f3]">
                    <td className="px-4 py-4 text-[#4f4944]">{fmtDate(rec.date)}</td>
                    <td className="px-4 py-4"><Badge color={rec.userId?._id === rec.userId ? "green" : "blue"}>{getOwnerLabel(rec)}</Badge></td>
                    <td className="px-4 py-4 text-right font-600 text-[#201c1a]">{fmtCurrency(rec.volume)}</td>
                    <td className="px-4 py-4 text-right text-[#6f6760]">{fmt(rec.euroRate)}</td>
                    <td className="px-4 py-4 text-right text-[#6f6760]">{fmt(rec.remittanceFeesEuro, 2)}</td>
                    <td className="px-4 py-4 text-right text-[#6f6760]">{fmt(rec.totalReceivedEuro, 2)}</td>
                    <td className="px-4 py-4 text-right text-[#6f6760]">{fmt(rec.usdtReceived, 2)}</td>
                    <td className="px-4 py-4 text-right font-700 text-[#201c1a]">{fmtCurrency(rec.totalAmountInr)}</td>
                    <td className={cn("px-4 py-4 text-right font-700", rec.netProfit >= 0 ? "text-[#5d7b58]" : "text-[#b85555]")}>
                      {fmtCurrency(rec.netProfit)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewRecord(rec)} className="rounded-xl p-2 text-[#8f857d] transition hover:bg-[#f4efe8] hover:text-[#201c1a]" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {rec.userId?._id === rec.userId && (
                          <button onClick={() => setDeleteRecord(rec)} className="rounded-xl p-2 text-[#8f857d] transition hover:bg-[#fdeaea] hover:text-[#b85555]" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-[#eee6df] p-4">
            <Btn variant="outline" onClick={() => loadRecords(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Btn>
            <span className="text-sm text-[#7f766e]">Page {page} of {totalPages}</span>
            <Btn variant="outline" onClick={() => loadRecords(page + 1)} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Btn>
          </div>
        )}
      </div>

      <ArbitroModal open={showModal} onClose={() => setShowModal(false)} token={token} onSaved={() => { setShowModal(false); loadRecords(1); }} />

      <Modal
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title="Arbitro transaction details"
        size="xl"
        headerSlot={
          viewRecord && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="yellow">{fmtDate(viewRecord.date)}</Badge>
              <Badge color={viewRecord.netProfit >= 0 ? "green" : "red"}>{viewRecord.netProfit >= 0 ? "Profit" : "Loss"}</Badge>
              <Badge color="blue">Owner: {getOwnerLabel(viewRecord)}</Badge>
            </div>
          )
        }
      >
        {viewRecord && (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[24px] border border-[#eee6df] bg-[#f7f2ec] p-5 lg:col-span-1">
                <p className="text-xs font-700 uppercase tracking-[0.12em] text-[#9b9188]">Entry summary</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs text-[#8f857d]">Date</p>
                    <p className="mt-1 text-sm font-700 text-[#201c1a]">{fmtDate(viewRecord.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8f857d]">Volume</p>
                    <p className="mt-1 text-lg font-700 text-[#201c1a]">{fmtCurrency(viewRecord.volume)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8f857d]">Net profit</p>
                    <p className={cn("mt-1 text-lg font-700", viewRecord.netProfit >= 0 ? "text-[#4f714a]" : "text-[#a24f4f]")}>
                      {fmtCurrency(viewRecord.netProfit)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 lg:col-span-2">
                <div>
                  <h4 className="mb-3 text-sm font-700 uppercase tracking-[0.12em] text-[#9b9188]">Conversion breakdown</h4>
                  <DetailGrid
                    columns={4}
                    items={[
                      { label: "Euro Rate", value: fmt(viewRecord.euroRate) },
                      { label: "Total EURO Before Fees", value: fmt(viewRecord.totalEuroBeforeFees, 2) },
                      { label: "Remittance Fees INR", value: fmtCurrency(viewRecord.remittanceFees) },
                      { label: "Remittance Fees EURO", value: fmt(viewRecord.remittanceFeesEuro, 2) },
                      { label: "EURO After Fees", value: fmt(viewRecord.totalReceivedEuro, 2), tone: "feature" },
                      { label: "USDT Purchase Rate", value: fmt(viewRecord.usdtPurchaseRateEuro) },
                      { label: "USDT Received", value: `${fmt(viewRecord.usdtReceived, 2)} USDT`, tone: "feature" },
                      { label: "USDT Selling Rate", value: fmt(viewRecord.usdtSellingRateInr) },
                      { label: "Total Amount INR", value: fmtCurrency(viewRecord.totalAmountInr), tone: "feature" }
                    ]}
                  />
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-700 uppercase tracking-[0.12em] text-[#9b9188]">Profit and taxes</h4>
                  <DetailGrid
                    items={[
                      { label: "Profit Before Tax", value: fmtCurrency(viewRecord.profitBeforeTax), tone: viewRecord.profitBeforeTax >= 0 ? "success" : "danger" },
                      { label: "Estonia Tax 20%", value: `-${fmtCurrency(viewRecord.estoniaTax)}`, tone: "warning" },
                      { label: "India Tax 30%", value: `-${fmtCurrency(viewRecord.indiaTax)}`, tone: "danger" },
                      { label: "Net Profit After Tax", value: fmtCurrency(viewRecord.netProfit), tone: viewRecord.netProfit >= 0 ? "success" : "danger" }
                    ]}
                  />
                </div>
              </div>
            </div>

            {viewRecord.notes && (
              <div className="rounded-[24px] border border-[#eee6df] bg-white p-5">
                <p className="text-xs font-700 uppercase tracking-[0.12em] text-[#9b9188]">Notes</p>
                <p className="mt-3 text-sm leading-6 text-[#4d4540]">{viewRecord.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title="Delete arbitro record?"
        description={`This will permanently remove the arbitro entry from ${deleteRecord ? fmtDate(deleteRecord.date) : ""}.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}