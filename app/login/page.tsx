// pages/login.tsx
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@local.test");
  const [password, setPassword] = useState("Password123!");
  const router = useRouter();

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await axios.post("/api/auth/login", { email, password });
      sessionStorage.setItem("access", r.data.access);
      router.push("/upload");
    } catch (err:any) {
      alert(err?.response?.data?.message || err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handle} className="p-6 border rounded">
        <h2 className="text-xl mb-4">Login</h2>
        <input className="block mb-2" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="block mb-2" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="px-3 py-1 bg-blue-600 text-white rounded">Login</button>
      </form>
    </div>
  );
}
