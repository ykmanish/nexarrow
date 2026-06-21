"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Page() { const router = useRouter(); useEffect(() => { router.replace(localStorage.getItem("nexus_token") ? "/dashboard" : "/login"); }, [router]); return null; }
