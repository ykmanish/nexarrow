import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { AuthLayout, Btn } from "../ui/SharedComponents";

export default function OTPPage({ onNavigate, state, onLogin }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return toast.error("Enter the 6-digit OTP");
    setLoading(true);
    try {
      const data = await api("/auth/verify-otp", { method: "POST", body: JSON.stringify({ userId: state?.userId, otp: code }) });
      toast.success("Email verified successfully!");
      onLogin(data.token, data.user);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await api("/auth/resend-otp", { method: "POST", body: JSON.stringify({ userId: state?.userId }) });
      toast.success("New OTP sent to your email");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout title="Verify email" subtitle={`Enter the 6-digit code sent to ${state?.email || "your email"}`}>
      <div className="space-y-6">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input key={i} ref={(el) => (inputs.current[i] = el)} type="text" maxLength={1} value={digit} onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} className="h-14 w-12 rounded-2xl border border-[#e8e0d8] bg-white text-center text-xl font-700 text-[#201c1a] outline-none transition focus:border-[#cfc3b8]" />
          ))}
        </div>
        <Btn onClick={handleVerify} loading={loading} className="w-full py-3">Verify email</Btn>
        <div className="text-center">
          <button onClick={handleResend} disabled={countdown > 0 || resending} className={("text-sm font-600 transition", countdown > 0 ? "text-[#b0a7a0]" : "text-[#201c1a] hover:text-[#000]")}>
            {countdown > 0 ? `Resend OTP in ${countdown}s` : resending ? "Sending..." : "Resend OTP"}
          </button>
        </div>
        <button onClick={() => onNavigate("login")} className="w-full text-center text-sm font-600 text-[#7c736b] transition hover:text-[#201c1a]">Back to sign in</button>
      </div>
    </AuthLayout>
  );
}