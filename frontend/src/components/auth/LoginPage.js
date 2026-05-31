import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useRecaptcha } from "@/lib/hooks";
import { AuthLayout, Input, Btn, Eye, EyeOff } from "../ui/SharedComponents";

export default function LoginPage({ onNavigate, onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const getToken = useRecaptcha();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Please fill all fields");
    setLoading(true);
    try {
      const recaptchaToken = await getToken("login");
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ ...form, recaptchaToken }) });
      toast.success(`Welcome back, ${data.user.name}!`);
      onLogin(data.token, data.user);
    } catch (err) {
      if (err.message?.includes("not verified")) {
        toast.error("Email not verified. Redirecting...");
        setTimeout(() => onNavigate("verify-otp", { email: form.email }), 1500);
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Access your dashboard, documents, finance, and arbitro records.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        <div className="space-y-2">
          <label className="block text-sm font-600 text-[#5c554f]">Password</label>
          <div className="relative">
            <input type={showPwd ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full rounded-2xl border border-[#e8e0d8] bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-[#cfc3b8] placeholder:text-[#b3aaa2]" required />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#8f857d] transition hover:bg-[#f4efe8]">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={() => onNavigate("forgot-password")} className="text-sm font-600 text-[#6d665f] transition hover:text-[#201c1a]">Forgot password?</button>
        </div>
        <Btn type="submit" loading={loading} className="w-full py-3">Sign in</Btn>
      </form>
      <div className="mt-6 text-center text-sm text-[#857c75]">
        Don&apos;t have an account?{" "}
        <button onClick={() => onNavigate("register")} className="font-700 text-[#201c1a]">Create account</button>
      </div>
    </AuthLayout>
  );
}