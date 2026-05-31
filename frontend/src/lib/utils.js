export const fmt = (n, dec = 2) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n || 0);

export const fmtCurrency = (n) => `₹${fmt(n)}`;

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const cn = (...classes) => classes.filter(Boolean).join(" ");

export const isImageFile = (mime = "") => mime.includes("image");
export const isPdfFile = (mime = "") => mime.includes("pdf");
export const isSheetFile = (mime = "") =>
  mime.includes("sheet") || mime.includes("excel") || mime.includes("csv");
export const isWordFile = (mime = "") =>
  mime.includes("word") || mime.includes("document");

export const pad = (n) => String(n).padStart(2, "0");

export const formatDateInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDisplayDate = (dateString) => {
  if (!dateString) return "dd-mm-yyyy";
  const [y, m, d] = dateString.split("-");
  if (!y || !m || !d) return "dd-mm-yyyy";
  return `${d}-${m}-${y}`;
};

export const monthYearLabel = (date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export const getMonthMatrix = (viewDate) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  const days = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
};