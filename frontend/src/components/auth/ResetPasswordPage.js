import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { AuthLayout, Input, Btn, Eye, EyeOff } from "../ui/SharedComponents";

export default function ResetPasswordPage({ onNavigate }) {
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const token = urlParams.get("token") || "";
  const email = urlParams.get("email") || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return toast.error("Passwords don't match");
    if (form.newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, token, newPassword: form.newPassword }) });
      toast.success("Password reset successfully!");
      setTimeout(() => onNavigate("login"), 1500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-600 text-[#5c554f]">New password</label>
          <div className="relative">
            <input type={showPwd ? "text" : "password"} placeholder="Min. 6 characters" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} className="w-full rounded-2xl border border-[#e8e0d8] bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-[#cfc3b8] placeholder:text-[#b3aaa2]" required />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#8f857d] transition hover:bg-[#f4efe8]">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Input label="Confirm password" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} required />
        <Btn type="submit" loading={loading} className="w-full py-3">Reset password</Btn>
      </form>
    </AuthLayout>
  );
}