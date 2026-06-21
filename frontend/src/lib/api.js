const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://records.nexarrow.eu/api";
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6Lfn2istAAAAAHloHolw03qmIy96Mjxl6kEhl0r1";

export const api = async (endpoint, options = {}, token = null) => {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

export const fileViewUrl = (fileUrl) => `${API_BASE.replace("/api", "")}${fileUrl}`;

export { API_BASE, RECAPTCHA_SITE_KEY };