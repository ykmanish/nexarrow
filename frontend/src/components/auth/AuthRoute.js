"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ToasterProvider } from "../ui/SharedComponents";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import OTPPage from "./OTPPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import { RECAPTCHA_SITE_KEY } from "@/lib/api";

export default function AuthRoute({ page }) {

  const router = useRouter();
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || RECAPTCHA_SITE_KEY === "6Lfn2istAAAAAHloHolw03qmIy96Mjxl6kEhl0r1" || document.querySelector("script[data-nexarrow-recaptcha]")) return;
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.dataset.nexarrowRecaptcha = "true";
    document.head.appendChild(script);
  }, []);
  const navigate = (target, state = {}) => {
    if (Object.keys(state).length) sessionStorage.setItem("nexus_auth_state", JSON.stringify(state));
    router.push(`/${target}`);
  };
  const login = (token, user) => {
    localStorage.setItem("nexus_token", token);
    localStorage.setItem("nexus_user", JSON.stringify(user));
    document.cookie = `nexus_token=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
    router.replace("/dashboard");
  };
  const state = typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("nexus_auth_state") || "{}") : {};
  return <><ToasterProvider />
    {page === "login" && <LoginPage onNavigate={navigate} onLogin={login} />}
    {page === "register" && <RegisterPage onNavigate={navigate} />}
    {page === "verify-otp" && <OTPPage onNavigate={navigate} state={state} onLogin={login} />}
    {page === "forgot-password" && <ForgotPasswordPage onNavigate={navigate} />}
    {page === "reset-password" && <ResetPasswordPage onNavigate={navigate} />}
  </>;
}
