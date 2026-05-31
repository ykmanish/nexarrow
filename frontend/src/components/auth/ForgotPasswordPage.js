import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { AuthLayout, Input, Btn, Check } from "../ui/SharedComponents";

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email address");
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
      toast.success("Reset link sent to your email");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle={sent ? "Check your email for the reset link." : "Enter your email and we'll send a reset link."}>
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Btn type="submit" loading={loading} className="w-full py-3">Send reset link</Btn>
        </form>
      ) : (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f3e5] text-[#5d7b58]">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-sm text-[#7d746c]">We sent a password reset link to <strong>{email}</strong></p>
        </div>
      )}
      <button onClick={() => onNavigate("login")} className="mt-4 w-full text-center text-sm font-600 text-[#7c736b] transition hover:text-[#201c1a]">Back to sign in</button>
    </AuthLayout>
  );
}