import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Toaster } from "react-hot-toast";
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X, Eye, EyeOff,
  Check, ArrowDownLeft, ArrowUpRight, Wallet, FileText, FileSpreadsheet,
  FileType, FileImage, Upload, Trash2, Filter, Plus, Search, Menu, LogOut,
  Bell, LayoutGrid, LineChart, Users, Globe, Lock, FolderOpen, Sparkles
} from "lucide-react";
import {
  cn,
  fmt,
  fmtCurrency,
  fmtDateTime,
  formatDisplayDate,
  formatDateInput,
  monthYearLabel,
  getMonthMatrix,
  fileSize
} from "@/lib/utils";
import { useOutsideClose, useFloatingPosition } from "@/lib/hooks";

export {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X, Eye, EyeOff,
  Check, ArrowDownLeft, ArrowUpRight, Wallet, FileText, FileSpreadsheet,
  FileType, FileImage, Upload, Trash2, Filter, Plus, Search, Menu, LogOut,
  Bell, LayoutGrid, LineChart, FolderOpen, Sparkles
};

export const ToasterProvider = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 3200,
      style: {
        fontFamily: '"Google Sans", "Google Sans Text", "Geist", Arial, sans-serif',
        fontSize: "14px",
        fontWeight: "600",
        border: "1px solid #dadce0",
        background: "#ffffff",
        color: "#202124",
        borderRadius: "12px",
        padding: "12px 14px",
      },
      success: {
        iconTheme: { primary: "#5d7b58", secondary: "#ffffff" },
      },
      error: {
        iconTheme: { primary: "#b85555", secondary: "#ffffff" },
      },
    }}
  />
);

export const LogoMark = ({ className = "h-8 w-8" }) => (
  <div className={cn("flex items-center justify-center border border-zinc-200 rounded-full", className)}>
    <img src="/logo.svg" alt="Logo" className="h-28 w-28" />
  </div>
);

export const BrandHeader = ({ compact = false }) => (
  <div className="flex items-center gap-3">
    <LogoMark className="h-10 w-10" />
    {!compact ? (
      <div>
        <div className="text-lg small font-700 pb-1.25 tracking-[0.02em] text-[#000000]">Nexarrow</div>
        <div className="text-xs text-[#8b8179]">Smart operations</div>
      </div>
    ) : null}
  </div>
);

export const SectionTitle = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-[24px] font-semibold font-700 tracking-[-0.03em] text-[#202124]">{title}</h2>
      {subtitle ? <p className="mt-1 text-[13px] text-[#77787c]">{subtitle}</p> : null}
    </div>
    {action}
  </div>
);

export const Modal = ({ open, onClose, title, children, size = "md", headerSlot }) => {
  const sizeMap = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close modal backdrop" className="absolute inset-0 bg-[#303034]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("relative w-full overflow-y-auto rounded-2xl bg-[#f7f7f8] max-h-[92vh]", sizeMap[size])}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dedee0] bg-[#f7f7f8]/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-700 text-[#201c1a]">{title}</h2>
            {headerSlot ? <div className="mt-2">{headerSlot}</div> : null}
          </div>
          <button onClick={onClose} className="rounded-lg border border-[#d8d8da] bg-white p-2 text-[#6f7074] transition hover:bg-[#ebebed]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  confirmVariant = "danger",
  loading = false
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#eee6df] bg-[#f8f4ef] p-4 text-sm text-[#6c645d]">{description}</div>
      <div className="flex gap-3">
        <Btn variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
        <Btn variant={confirmVariant} onClick={onConfirm} loading={loading} className="flex-1">{confirmText}</Btn>
      </div>
    </div>
  </Modal>
);

export const Input = ({ label, error, className = "", ...props }) => (
  <div className="space-y-2">
    {label ? <label className="block text-sm font-600 text-[#5c554f]">{label}</label> : null}
    <input
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition",
        error ? "border-[#e7b4b4] bg-[#fff4f4] focus:border-[#d78282]" : "border-[#e8e0d8] bg-white focus:border-[#cfc3b8]",
        "placeholder:text-[#b3aaa2]",
        className
      )}
      {...props}
    />
    {error ? <p className="text-xs text-[#c05c5c]">{error}</p> : null}
  </div>
);

export const TextArea = ({ label, className = "", ...props }) => (
  <div className="space-y-2">
    {label ? <label className="block text-sm font-600 text-[#5c554f]">{label}</label> : null}
    <textarea
      className={cn(
        "w-full rounded-lg border border-[#d5d5d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8a9fe8] focus:ring-2 focus:ring-[#9baded]/20 placeholder:text-[#a5a5a9] resize-none",
        className
      )}
      {...props}
    />
  </div>
);

export const FilterField = ({ label, children, className = "" }) => (
  <div className={cn("space-y-2", className)}>
    {label ? <label className="block text-xs font-600 text-[#5f6368]">{label}</label> : null}
    {children}
  </div>
);

export const StyledSelect = ({ label, value, onChange, options = [], placeholder = "Select" }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const floating = useFloatingPosition(open, rootRef, 220, 280);
  useOutsideClose([rootRef, menuRef], () => setOpen(false));
  const selected = options.find((opt) => opt.value === value);

  return (
    <FilterField label={label}>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={cn("flex h-[48px] w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-sm font-500 transition", open ? "border-[#a99df2] ring-2 ring-[#8c7cf0]/15" : "border-[#dadce0] hover:border-[#bdc1c6]", "text-[#3c4043]")}
        >
          <div className="flex items-center gap-3">
            <ChevronDown className="h-4 w-4 text-[#8f857d]" />
            <span>{selected?.label || placeholder}</span>
          </div>
        </button>
        {open ? (
          <div
            ref={menuRef}
            className={cn(
              "floating-control-menu absolute z-30 w-full overflow-hidden rounded-2xl bg-white p-1.5",
              floating.vertical === "down" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]",
              floating.align === "left" ? "left-0" : "right-0"
            )}
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center px-4 py-2.5 text-left text-sm transition",
                    active ? "rounded-xl bg-[#eeeaff] text-[#5d4ca4]" : "rounded-xl bg-white text-[#3c4043] hover:bg-[#f1f3f4]"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </FilterField>
  );
};

export const StyledDatePicker = ({ label, value, onChange, compact = false }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const popupRef = useRef(null);
  const parsed = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  const [position, setPosition] = useState({ placement: "bottom", left: 0, top: 0 });
  const [showYearSelect, setShowYearSelect] = useState(false);
  const [showMonthSelect, setShowMonthSelect] = useState(false);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [value]);

  useEffect(() => {
    if (!open || !rootRef.current) return;

    const updatePosition = () => {
      const rect = rootRef.current.getBoundingClientRect();
      const popupWidth = 320;
      const popupHeight = 380;
      const gap = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = rect.left;
      if (left + popupWidth > viewportWidth - 12) {
        left = viewportWidth - popupWidth - 12;
      }
      if (left < 12) left = 12;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + gap;
      let placement = "bottom";

      if (spaceBelow < popupHeight && spaceAbove > popupHeight) {
        top = rect.top - popupHeight - gap;
        placement = "top";
      } else if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
        top = Math.max(12, rect.top - popupHeight - gap);
        placement = "top";
      }

      setPosition({ placement, top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        open &&
        rootRef.current &&
        !rootRef.current.contains(event.target) &&
        popupRef.current &&
        !popupRef.current.contains(event.target)
      ) {
        setOpen(false);
        setShowYearSelect(false);
        setShowMonthSelect(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const monthDays = useMemo(() => getMonthMatrix(viewDate), [viewDate]);
  const selectedValue = value || "";
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const goMonth = (delta) => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const isSameDay = (date1, date2) =>
    date1 &&
    date2 &&
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  const handleDateSelect = (day) => {
    onChange(formatDateInput(day));
    setOpen(false);
    setShowYearSelect(false);
    setShowMonthSelect(false);
  };

  const handleMonthSelect = (monthIndex) => {
    setViewDate(new Date(currentYear, monthIndex, 1));
    setShowMonthSelect(false);
  };

  const handleYearSelect = (year) => {
    setViewDate(new Date(year, currentMonth, 1));
    setShowYearSelect(false);
  };

  const quickSelect = (type) => {
    const today = new Date();

    if (type === "today") {
      onChange(formatDateInput(today));
    } else if (type === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      onChange(formatDateInput(yesterday));
    } else if (type === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      onChange(formatDateInput(weekAgo));
    } else if (type === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      onChange(formatDateInput(monthAgo));
    }

    setOpen(false);
    setShowYearSelect(false);
    setShowMonthSelect(false);
  };

  const popup = open ? createPortal(
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: "320px",
        zIndex: 9999,
      }}
      className="floating-control-menu overflow-hidden rounded-2xl bg-white"
    >
      <div className="border-b border-[#f0e8e0] bg-gradient-to-r from-[#fcfaf7] to-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMonthSelect((p) => !p)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-600 text-[#201c1a] hover:bg-[#f5f0eb] transition-colors"
              >
                {months[currentMonth]}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showMonthSelect && "rotate-180")} />
              </button>
              {showMonthSelect && (
                <div className="floating-control-menu absolute left-0 top-full mt-1 z-[10000] w-32 rounded-xl bg-white p-2">
                  <div className="grid grid-cols-3 gap-1">
                    {months.map((month, idx) => (
                      <button
                        key={month}
                        type="button"
                        onClick={() => handleMonthSelect(idx)}
                        className={cn(
                          "rounded-lg px-2 py-1.5 text-xs font-500 transition-colors",
                          idx === currentMonth ? "bg-[#2c2624] text-white" : "text-[#5c554f] hover:bg-[#f5f0eb]"
                        )}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowYearSelect((p) => !p)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-600 text-[#201c1a] hover:bg-[#f5f0eb] transition-colors"
              >
                {currentYear}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showYearSelect && "rotate-180")} />
              </button>
              {showYearSelect && (
                <div className="floating-control-menu absolute left-0 top-full mt-1 z-[10000] max-h-48 w-28 overflow-y-auto rounded-xl bg-white p-2">
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearSelect(year)}
                      className={cn(
                        "w-full rounded-lg px-3 py-1.5 text-xs font-500 transition-colors",
                        year === currentYear ? "bg-[#2c2624] text-white" : "text-[#5c554f] hover:bg-[#f5f0eb]"
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="rounded-lg p-1.5 text-[#8f857d] hover:bg-[#f5f0eb] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="rounded-lg p-1.5 text-[#8f857d] hover:bg-[#f5f0eb] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 border-b border-[#f0e8e0] bg-[#faf8f5] px-3 py-2">
        {[
          { label: "Today", value: "today" },
          { label: "Yesterday", value: "yesterday" },
          { label: "Week", value: "week" },
          { label: "Month", value: "month" }
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => quickSelect(opt.value)}
            className="rounded-lg px-2 py-1.5 text-xs font-500 text-[#6d655e] transition-colors hover:bg-[#f0e8e0]"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 grid grid-cols-7 gap-y-1 text-center">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, idx) => (
            <div
              key={day}
              className={cn(
                "py-1 text-xs font-600",
                [0, 6].includes(idx) ? "text-[#c96a6a]" : "text-[#8f857d]"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {monthDays.map((day, idx) => {
            const dateValue = formatDateInput(day);
            const inCurrentMonth = day.getMonth() === viewDate.getMonth();
            const isSelected = selectedValue === dateValue;
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDateSelect(day)}
                className={cn(
                  "relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-500 transition-all",
                  !inCurrentMonth && "text-[#c0b8b0]",
                  inCurrentMonth && !isSelected && !isToday && "text-[#2f2926] hover:bg-[#f5f0eb]",
                  isSelected && "bg-[#2c2624] text-white",
                  isToday && !isSelected && "border-2 border-[#cfc3b8] bg-[#fefaf5] font-700"
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#f0e8e0] bg-[#faf8f5] px-4 py-3">
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
            setShowYearSelect(false);
            setShowMonthSelect(false);
          }}
          className="text-sm font-500 text-[#b85555] transition-colors hover:text-[#a04747]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-1.5 text-sm font-500 text-[#6d655e] transition-colors hover:bg-[#f0e8e0]"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <FilterField label={label}>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-[#d5d5d8] bg-white px-3 text-left transition-all hover:border-[#aaaab0]",
            compact ? "h-[48px]" : "h-[52px]",
            open && "border-[#a99df2] ring-2 ring-[#8c7cf0]/15"
          )}
        >
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-[#8f857d]" />
            <span className={cn("text-sm font-500", value ? "text-[#2f2926]" : "text-[#90867f]")}>
              {value ? formatDisplayDate(value) : "Select date"}
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-[#8f857d] transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>
      {popup}
    </FilterField>
  );
};

export const VisibilitySelector = ({ value, onChange, users = [], selectedUsers = [], onUsersChange }) => {
  const [showUserSelect, setShowUserSelect] = useState(false);

  const visibilityOptions = [
    { value: "all", label: "Everyone", icon: <Globe className="h-4 w-4" />, description: "Visible to all users" },
    { value: "users", label: "Specific Users", icon: <Users className="h-4 w-4" />, description: "Visible to selected users only" },
    { value: "private", label: "Only Me", icon: <Lock className="h-4 w-4" />, description: "Visible only to you" },
  ];

  const currentOption =
    visibilityOptions.find((opt) =>
      value === "all" ? opt.value === "all" :
      value === "users" ? opt.value === "users" :
      opt.value === "private"
    ) || visibilityOptions[0];

  const handleVisibilityChange = (val) => {
    onChange(val);
    if (val === "users") {
      setShowUserSelect(true);
    } else {
      setShowUserSelect(false);
      if (val === "all") {
        onUsersChange([]);
      }
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-600 text-[#5c554f]">Visible to</label>
      <div className="grid grid-cols-3 gap-2">
        {visibilityOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleVisibilityChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all",
              currentOption.value === opt.value
                ? "border-[#cfc3b8] bg-[#f7f2ec]"
                : "border-[#e8e0d8] bg-white hover:bg-[#faf7f3]"
            )}
          >
            {opt.icon}
            <span className="text-xs font-600">{opt.label}</span>
            <span className="text-[10px] text-[#8f857d]">{opt.description}</span>
          </button>
        ))}
      </div>

      {showUserSelect && users.length > 0 && (
        <div className="mt-3 rounded-xl border border-[#e8e0d8] bg-white p-3">
          <label className="mb-2 block text-xs font-600 text-[#8f857d]">Select users</label>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {users.map((user) => (
              <label key={user._id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-[#f7f2ec]">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onUsersChange([...selectedUsers, user._id]);
                    } else {
                      onUsersChange(selectedUsers.filter((id) => id !== user._id));
                    }
                  }}
                  className="h-4 w-4 rounded border-[#cfc3b8]"
                />
                <div>
                  <p className="text-sm font-600 text-[#201c1a]">{user.name}</p>
                  <p className="text-xs text-[#8f857d]">{user.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChevronUpDownIconUp = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);

const ChevronUpDownIconDown = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14" />
    <path d="M19 12l-7 7-7-7" />
  </svg>
);

export const Spinner = ({ className = "h-5 w-5" }) => (
  <span className={cn("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)} />
);

export const Btn = ({ children, variant = "primary", loading, className = "", ...props }) => {
  const variants = {
    primary: "bg-[#25262a] text-white hover:bg-[#111216] border-[#25262a]",
    secondary: "bg-[#ededee] text-[#34353a] hover:bg-[#e1e1e3] border-[#d9d9dc]",
    outline: "bg-white text-[#34353a] hover:bg-[#f1f1f2] border-[#d8d8da]",
    danger: "bg-[#b85555] text-white hover:bg-[#a04747] border-[#b85555]",
    success: "bg-[#5d7b58] text-white hover:bg-[#4f6a4b] border-[#5d7b58]",
    ghost: "bg-transparent text-[#5c554f] hover:bg-[#f3ede7] border-transparent",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-600 transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : children}
    </button>
  );
};

export const Badge = ({ children, color = "default" }) => {
  const colors = {
    default: "bg-[#e8e8ea] text-[#55565a]",
    blue: "bg-[#bfe2ff] text-[#245f85]",
    purple: "bg-[#ddd1ff] text-[#684da7]",
    green: "bg-[#bfe8b4] text-[#315f2d]",
    red: "bg-[#ffd0d0] text-[#963f3f]",
    yellow: "bg-[#ffe09a] text-[#735718]",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-600 capitalize", colors[color])}>{children}</span>;
};

export const EmptyState = ({ icon, title, text, action }) => (
  <div className="rounded-2xl border border-[#dadce0] bg-white px-6 py-12 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f3f4] text-[#5f6368]">{icon}</div>
    <h3 className="text-base font-700 text-[#202124]">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-[#80868b]">{text}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export const AuthLayout = ({ children, title, subtitle }) => (
  <div className="google-ui min-h-screen flex justify-center items-center bg-[#f1f3f4] px-4 py-10">
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl bg-white p-8">
        <div className="mb-7 text-center">
          <h1 className="text-[30px] font-700 tracking-[-0.04em] text-[#202124]">{title}</h1>
          <p className="mt-2 text-sm text-[#80868b]">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  </div>
);

export const DetailGrid = ({ items, columns = 2 }) => (
  <div className={cn("grid gap-3", columns === 4 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2")}>
    {items.map((item) => (
      <div
        key={item.label}
        className={cn(
          "rounded-xl border px-4 py-4",
          item.tone === "success" ? "border-[#d8e7d4] bg-[#edf6eb]" :
          item.tone === "danger" ? "border-[#f1d6d6] bg-[#fdf1f1]" :
          item.tone === "warning" ? "border-[#f2e1bb] bg-[#fff7e8]" :
          item.tone === "feature" ? "border-[#d2e3fc] bg-[#f2f7ff]" :
          "border-[#dadce0] bg-white"
        )}
      >
        <p className="text-[11px] font-700 uppercase tracking-[0.12em] text-[#9b9188]">{item.label}</p>
        <p
          className={cn(
            "mt-2 text-sm font-700",
            item.tone === "success" ? "text-[#4f714a]" :
            item.tone === "danger" ? "text-[#a24f4f]" :
            item.tone === "warning" ? "text-[#9a7531]" :
            "text-[#201c1a]"
          )}
        >
          {item.value}
        </p>
      </div>
    ))}
  </div>
);
