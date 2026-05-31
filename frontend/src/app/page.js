"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { ToasterProvider } from "../components/ui/SharedComponents";
import LoginPage from "../components/auth/LoginPage";
import RegisterPage from "../components/auth/RegisterPage";
import OTPPage from "../components/auth/OTPPage";
import ForgotPasswordPage from "../components/auth/ForgotPasswordPage";
import ResetPasswordPage from "../components/auth/ResetPasswordPage";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import HomePage from "../components/dashboard/HomePage";
import DocumentsPage from "../components/dashboard/DocumentsPage";
import FinancePage from "../components/dashboard/FinancePage";
import ArbitroPage from "../components/dashboard/ArbitroPage";
import { RECAPTCHA_SITE_KEY } from "@/lib/api";

export default function App() {
  const [page, setPage] = useState("login");
  const [pageState, setPageState] = useState({});
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("home");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== "YOUR_SITE_KEY") {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("nexus_token");
    const storedUser = localStorage.getItem("nexus_user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setPage("dashboard");
      } catch {
        localStorage.removeItem("nexus_token");
        localStorage.removeItem("nexus_user");
      }
    }
    if (typeof window !== "undefined" && window.location.search.includes("token=")) setPage("reset-password");
    setHydrated(true);
  }, []);

  const handleLogin = (tok, usr) => {
    setToken(tok);
    setUser(usr);
    localStorage.setItem("nexus_token", tok);
    localStorage.setItem("nexus_user", JSON.stringify(usr));
    setPage("dashboard");
    setActiveSection("home");
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("nexus_token");
    localStorage.removeItem("nexus_user");
    setPage("login");
    toast.success("Signed out successfully");
  };

  const navigate = (to, state = {}) => { setPage(to); setPageState(state); };
  if (!hydrated) return null;

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: "Inter", sans-serif; background: #f7f3ee; color: #201c1a; }
        body { min-height: 100vh; }
        button, input, textarea, select { font: inherit; }
      `}</style>
      <ToasterProvider />
      {page === "login" && <LoginPage onNavigate={navigate} onLogin={handleLogin} />}
      {page === "register" && <RegisterPage onNavigate={navigate} />}
      {page === "verify-otp" && <OTPPage onNavigate={navigate} state={pageState} onLogin={handleLogin} />}
      {page === "forgot-password" && <ForgotPasswordPage onNavigate={navigate} />}
      {page === "reset-password" && <ResetPasswordPage onNavigate={navigate} />}
      {page === "dashboard" && token && user && (
        <DashboardLayout user={user} token={token} activeSection={activeSection} onNavigate={(sec) => setActiveSection(sec)} onLogout={handleLogout}>
          {activeSection === "home" && <HomePage token={token} user={user} onNavigate={(sec) => setActiveSection(sec)} />}
          {activeSection === "documents" && <DocumentsPage token={token} />}
          {activeSection === "finance" && <FinancePage token={token} />}
          {activeSection === "arbitro" && <ArbitroPage token={token} />}
        </DashboardLayout>
      )}
    </>
  );
}