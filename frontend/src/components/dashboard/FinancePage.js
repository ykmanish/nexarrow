import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { api, API_BASE } from "@/lib/api";
import { fmtCurrency, fmtDateTime, cn } from "@/lib/utils";
import {
  SectionTitle, Btn, Filter, StyledSelect, StyledDatePicker,
  Spinner, Badge, Eye, Upload, Modal, Input, ArrowDownLeft, ArrowUpRight,
  ChevronLeft, ChevronRight, VisibilitySelector
} from "../ui/SharedComponents";

const TxModal = ({ open, onClose, type, token, onDone, balance }) => {
  const [form, setForm] = useState({ amount: "", description: "", reference: "" });
  const [file, setFile] = useState(null);
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
    if (!open) {
      setForm({ amount: "", description: "", reference: "" });
      setFile(null);
      setVisibility("all");
      setSelectedUsers([]);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    if (type === "withdrawal" && balance !== undefined && Number(form.amount) > balance) {
      return toast.error(`Insufficient balance. Available: ${fmtCurrency(balance)}`);
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("amount", form.amount);
      fd.append("description", form.description);
      fd.append("reference", form.reference);
      fd.append("visibleToAll", visibility === "all");
      fd.append("visibleToUsers", JSON.stringify(visibility === "users" ? selectedUsers : []));
      if (file) fd.append("attachment", file);

      const endpoint = type === "deposit" ? "/finance/deposit" : "/finance/withdrawal";
      await api(endpoint, { method: "POST", body: fd }, token);

      toast.success(type === "deposit" ? "Deposit processed successfully!" : "Withdrawal processed successfully!");
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDeposit = type === "deposit";

  return (
    <Modal open={open} onClose={onClose} title={isDeposit ? "Make a deposit" : "Withdraw funds"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={cn("rounded-2xl p-4 text-sm font-600", isDeposit ? "bg-[#e8f3e5] text-[#5d7b58]" : "bg-[#fdeaea] text-[#b85555]")}>
          {isDeposit ? "Depositing funds to your account." : `Available balance: ${fmtCurrency(balance || 0)}`}
        </div>

        <Input
          label="Amount"
          type="number"
          min="1"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
        />
        <Input
          label="Description"
          placeholder="e.g. Monthly salary, vendor payment..."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <Input
          label="Reference / Transaction ID"
          placeholder="Optional reference number"
          value={form.reference}
          onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
        />

        <VisibilitySelector
          value={visibility}
          onChange={setVisibility}
          users={users}
          selectedUsers={selectedUsers}
          onUsersChange={setSelectedUsers}
        />

        <div className="space-y-2">
          <label className="block text-sm font-600 text-[#5c554f]">Attachment (optional)</label>
          <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed p-4 transition", file ? "border-[#cfc3b8] bg-[#f7f2ec]" : "border-[#e8e0d8] bg-white hover:bg-[#faf7f3]")}>
            <Upload className="h-5 w-5 text-[#8a8179]" />
            <span className="text-sm text-[#6f6760]">{file ? file.name : "Attach receipt or document"}</span>
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Btn type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
          <Btn type="submit" loading={loading} variant={isDeposit ? "success" : "danger"} className="flex-1">
            {isDeposit ? "Confirm deposit" : "Confirm withdrawal"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};

export default function FinancePage({ token }) {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [viewTx, setViewTx] = useState(null);
  const [filter, setFilter] = useState({ type: "", startDate: "", endDate: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadBalance = useCallback(async () => {
    try {
      const data = await api("/finance/balance", {}, token);
      setBalance(data);
    } catch (err) {
      toast.error("Failed to load balance");
    }
  }, [token]);

  const loadTx = useCallback(async (p = 1) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: "15" });
      if (filter.type) params.append("type", filter.type);
      if (filter.startDate) params.append("startDate", filter.startDate);
      if (filter.endDate) params.append("endDate", filter.endDate);

      const data = await api(`/finance/transactions?${params.toString()}`, {}, token);
      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setTxLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadBalance(), loadTx(1)]);
      setLoading(false);
    };
    init();
  }, [loadBalance, loadTx]);

  const onTxDone = () => {
    loadBalance();
    loadTx(1);
    setShowDeposit(false);
    setShowWithdraw(false);
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Spinner className="h-8 w-8 text-[#7e756e]" /></div>;
  }

  const typeOptions = [
    { label: "All types", value: "" },
    { label: "Deposit", value: "deposit" },
    { label: "Withdrawal", value: "withdrawal" }
  ];

  const getOwnerLabel = (tx) => {
    if (tx.userId?._id === tx.userId) return "You";
    return tx.userId?.name || "Unknown";
  };

  return (
    <div className="finance-page mx-auto max-w-7xl space-y-5 overflow-visible">
      <SectionTitle
        title="Finance"
        subtitle="Manage your deposits, withdrawals and balance. Transactions shared by others appear here."
        action={
          <div className="flex gap-2">
            <Btn className="bg-cyan-500 border-none text-white hover:bg-cyan-600" onClick={() => setShowDeposit(true)}>Deposit</Btn>
            <Btn className="bg-red-500 border-none text-white hover:bg-red-600" onClick={() => setShowWithdraw(true)}>Withdraw</Btn>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
      {[
        { label: "Available balance", value: fmtCurrency(balance?.balance || 0), detail: balance?.currency || "INR", color: "#826ef0", bg: "#f0edff", icon: "₹" },
        { label: "Today deposits", value: fmtCurrency(balance?.today?.deposit?.total || 0), detail: `${balance?.today?.deposit?.count || 0} transactions`, color: "#64bd6a", bg: "#eaf6ec", icon: "↘" },
        { label: "Today withdrawals", value: fmtCurrency(balance?.today?.withdrawal?.total || 0), detail: `${balance?.today?.withdrawal?.count || 0} transactions`, color: "#df6b6b", bg: "#fceaea", icon: "↗" },
        { label: "Monthly deposits", value: fmtCurrency(balance?.month?.deposit?.total || 0), detail: `${balance?.month?.deposit?.count || 0} transactions`, color: "#53bbdb", bg: "#e7f6fa", icon: "↘" },
        { label: "Monthly withdrawals", value: fmtCurrency(balance?.month?.withdrawal?.total || 0), detail: `${balance?.month?.withdrawal?.count || 0} transactions`, color: "#a57cf2", bg: "#f4edff", icon: "↗" },
        ].map((card, index) => (
          <div key={card.label} className={cn("rounded-xl border border-[#d8d8da] bg-white p-4", index === 0 ? "lg:col-span-1" : "")}>
            <div className="flex items-center justify-between border-b border-[#d8d8da] pb-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm" style={{ backgroundColor: card.bg, color: card.color }}>{card.icon}</span><p className="text-sm font-700 text-[#45464c]">{card.label}</p></div><span className="text-xs text-[#aaaab0]">•••</span></div>
            <div className="flex items-end justify-between gap-3 pt-3"><div className="min-w-0"><p className="truncate text-xl font-700 text-[#292a2f]">{card.value}</p><p className="mt-1 text-xs text-[#98999e]">{card.detail}</p></div></div>
          </div>
        ))}
      </div>

      <div className="overflow-visible rounded-[30px] border-[#ebe3db] bg-[#fcfaf7]">
        <div className="overflow-visible border-b border-[#eee6df] p-5">
          <h3 className="text-base font-700 text-[#201c1a]">Transaction history</h3>
          <p className="mt-1 text-xs text-[#8f857d]">Showing transactions from you and users who shared with you</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-4 overflow-visible">
            <StyledSelect
              label="Type"
              value={filter.type}
              onChange={(next) => setFilter((f) => ({ ...f, type: next }))}
              options={typeOptions}
              placeholder="All types"
            />
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
              <Btn onClick={() => loadTx(1)} className="gap-2"><Filter className="h-4 w-4" />Apply filter</Btn>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {txLoading ? (
            <div className="flex items-center justify-center p-12"><Spinner className="h-6 w-6 text-[#7e756e]" /></div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#8f857d]">No transactions found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0e9e2] text-left text-xs font-700 uppercase tracking-[0.12em] text-[#9d938b]">
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id || tx.id} className="border-b border-[#f5efe9] last:border-b-0 hover:bg-[#faf7f3]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", tx.type === "deposit" ? "bg-[#e8f3e5] text-[#5d7b58]" : "bg-[#fdeaea] text-[#b85555]")}>
                          {tx.type === "deposit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </span>
                        <span className="capitalize text-[#3d3733]">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge color={tx.userId?._id === tx.userId ? "green" : "blue"}>{getOwnerLabel(tx)}</Badge>
                    </td>
                    <td className="px-5 py-4 text-[#4f4944]">{tx.description || "-"}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#8f857d]">{tx.reference || "-"}</td>
                    <td className="px-5 py-4 text-[#6f6760]">{fmtDateTime(tx.createdAt)}</td>
                    <td className={cn("px-5 py-4 text-right font-700", tx.type === "deposit" ? "text-[#5d7b58]" : "text-[#b85555]")}>
                      {tx.type === "deposit" ? "+" : "-"}{fmtCurrency(tx.amount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Badge color={tx.status === "completed" ? "green" : tx.status === "pending" ? "yellow" : "red"}>{tx.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => setViewTx(tx)} className="rounded-xl p-2 text-[#8f857d] transition hover:bg-[#f4efe8] hover:text-[#201c1a]">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-[#eee6df] p-4">
            <Btn variant="outline" onClick={() => loadTx(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Btn>
            <span className="text-sm text-[#7f766e]">Page {page} of {totalPages}</span>
            <Btn variant="outline" onClick={() => loadTx(page + 1)} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Btn>
          </div>
        )}
      </div>

      <TxModal open={showDeposit} onClose={() => setShowDeposit(false)} type="deposit" token={token} onDone={onTxDone} balance={balance?.balance} />
      <TxModal open={showWithdraw} onClose={() => setShowWithdraw(false)} type="withdrawal" token={token} onDone={onTxDone} balance={balance?.balance} />

      <Modal open={!!viewTx} onClose={() => setViewTx(null)} title="Transaction details" size="sm">
        {viewTx && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 border-b border-[#eee6df] pb-3">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", viewTx.type === "deposit" ? "bg-[#e8f3e5] text-[#5d7b58]" : "bg-[#fdeaea] text-[#b85555]")}>
                {viewTx.type === "deposit" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xl font-semibold small font-700 text-[#201c1a]">{viewTx.type === "deposit" ? "+" : "-"}{fmtCurrency(viewTx.amount)}</p>
                <Badge color={viewTx.type === "deposit" ? "green" : "red"}>{viewTx.type}</Badge>
              </div>
            </div>

            {[
              ["Owner", viewTx.userId?.name || "You"],
              ["Description", viewTx.description || "-"],
              ["Reference", viewTx.reference || "-"],
              ["Status", viewTx.status || "-"],
              ["Date & Time", fmtDateTime(viewTx.createdAt)],
              ["Currency", viewTx.currency || "INR"]
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <span className="text-[#8b8179]">{label}</span>
                <span className="font-600 capitalize text-[#201c1a]">{val}</span>
              </div>
            ))}

            {viewTx.attachmentUrl && (
              <a
                href={`${API_BASE.replace("/api", "")}${viewTx.attachmentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-700 text-[#201c1a]"
              >
                <Eye className="h-4 w-4" />View attachment
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}