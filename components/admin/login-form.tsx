"use client";
import { useState } from "react";
import { LockKeyhole, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function LoginForm({ returnTo }: { returnTo: string }) {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
          returnTo,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "No se pudo iniciar sesión.");
        return;
      }
      window.location.assign(body.data.returnTo);
    } catch {
      setError("No se pudo conectar con el servicio de autenticación.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="w-full rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
        <LockKeyhole aria-hidden="true" className="h-5 w-5" />
      </div>
      <h1 className="font-display text-3xl font-bold text-primary">
        Acceso administrativo
      </h1>
      <p className="mt-2 text-sm leading-6 text-text-2">
        Ingresa con la cuenta editorial de QuisqueyaTech.
      </p>
      <div className="mt-6">
        <label htmlFor="email" className="text-sm font-semibold text-text">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-2 min-h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-tech focus:ring-2 focus:ring-larimar"
        />
      </div>
      <div className="mt-4">
        <label htmlFor="password" className="text-sm font-semibold text-text">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 min-h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-tech focus:ring-2 focus:ring-larimar"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <Button className="mt-6 w-full" type="submit" disabled={loading}>
        {loading && (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        )}
        Entrar
      </Button>
    </form>
  );
}
