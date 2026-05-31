import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useRecaptcha } from "@/lib/hooks";
import { AuthLayout, Input, Btn, Eye, EyeOff } from "../ui/SharedComponents";

export default function RegisterPage({ onNavigate }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const getToken = useRecaptcha();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error("Please fill all fields");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      const recaptchaToken = await getToken("register");
      const data = await api("/auth/register", { method: "POST", body: JSON.stringify({ ...form, recaptchaToken }) });
      toast.success("Account created! Check your email for OTP.");
      onNavigate("verify-otp", { userId: data.userId, email: form.email });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Join Aether to manage finances, files, and daily operations.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" placeholder="John Doe" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        <div className="space-y-2">
          <label className="block text-sm font-600 text-[#5c554f]">Password</label>
          <div className="relative">
            <input type={showPwd ? "text" : "password"} placeholder="Min. 6 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full rounded-2xl border border-[#e8e0d8] bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-[#cfc3b8] placeholder:text-[#b3aaa2]" required />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#8f857d] transition hover:bg-[#f4efe8]">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Btn type="submit" loading={loading} className="w-full py-3">Create account</Btn>
      </form>
      <div className="mt-6 text-center text-sm text-[#857c75]">
        Already have an account?{" "}
        <button onClick={() => onNavigate("login")} className="font-700 text-[#201c1a]">Sign in</button>
      </div>
    </AuthLayout>
  );
}