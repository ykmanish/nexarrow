"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const controlClass = "w-full rounded-lg border border-[#d5d5d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8a9fe8] focus:ring-2 focus:ring-[#9baded]/20";

export default function FloatingSelect({ label, options, value, onChange, placeholder = "Select an option", showInitials = false, compactLabel = false }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const icon = (option, size = 28) => option?.logo
    ? <Image src={option.logo} alt="" width={size} height={size} className="rounded-lg object-contain" style={{ width: size, height: size }} />
    : showInitials && option
      ? <span className="flex shrink-0 items-center justify-center rounded-lg bg-[#eeeaff] font-700 text-[#6858b4]" style={{ width: size, height: size }}>{String(option.label).trim().charAt(0).toUpperCase()}</span>
      : null;

  return <div className="space-y-2">
    {label && <label className={compactLabel ? "text-xs font-700 uppercase tracking-[.1em] text-[#999097]" : "block text-sm font-600 text-[#5c554f]"}>{label}</label>}
    <div className="relative" ref={root}>
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}
        className={cn(controlClass, "flex items-center gap-3 text-left", open && "ring-2 ring-[#8c7cf0]/15")}>
        {icon(selected)}
        <span className={cn("flex-1 font-600", selected ? "text-[#34343a]" : "text-[#929398]")}>{selected?.label || placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 text-[#8a8b91] transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0, y: -7, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .16 }}
          className="floating-control-menu absolute left-0 right-0 top-[calc(100%+7px)] z-50 max-h-64 overflow-y-auto rounded-2xl bg-white p-1.5">
          {options.length ? options.map((option) => {
            const active = String(option.value) === String(value);
            return <button key={String(option.value)} type="button" disabled={option.disabled} onClick={() => { onChange(option.value); setOpen(false); }}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition", active ? "bg-[#eeeaff] text-[#5d4ca4]" : "text-[#4b4c52] hover:bg-[#f2f2f4]", option.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent")}>
              {icon(option)}
              <span className="min-w-0 flex-1"><span className="block truncate font-600">{option.label}</span>{option.description && <span className="mt-0.5 block truncate text-xs font-400 text-[#96979c]">{option.description}</span>}</span>
              {active && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#7b68d8] text-white"><Check className="h-3 w-3" /></span>}
            </button>;
          }) : <p className="px-3 py-3 text-sm text-[#929398]">No options available</p>}
        </motion.div>}
      </AnimatePresence>
    </div>
  </div>;
}
