"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@local.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function validate() {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email.");
      return false;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    setError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const resp = await axios.post("/api/auth/login", { email, password });
      const access = resp.data?.access;
      if (access) {
        sessionStorage.setItem("access", access);
      }
      // navigate to the protected upload page
      router.push("/upload");
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-6 border rounded shadow-sm bg-white">
        <h2 className="text-2xl mb-4">Login</h2>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <label className="block mb-1 text-sm">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
          required
        />

        <label className="block mb-1 text-sm">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>
    </div>
  );
}
