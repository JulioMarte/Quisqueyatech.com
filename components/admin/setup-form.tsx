"use client";
import { useState } from "react";
import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const field =
  "mt-2 min-h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-tech focus:ring-2 focus:ring-larimar";
export function SetupForm() {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [codes, setCodes] = useState<string[]>([]),
    [confirmed, setConfirmed] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmation")) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
          setupCode: data.get("setupCode"),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.message || body.error || "No se pudo crear el administrador.");
        return;
      }
      setCodes(body.data.recoveryCodes);
    } catch {
      setError("No se pudo conectar con Convex Cloud.");
    } finally {
      setLoading(false);
    }
  }
  if (codes.length)
    return (
      <section className="w-full rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <ShieldCheck className="h-10 w-10 text-tech" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl font-bold text-primary">Guarda tus códigos</h1>
        <p className="mt-2 text-sm leading-6 text-text-2">
          Se muestran una sola vez. Cada código recupera la cuenta una vez.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl bg-primary p-4 text-sm leading-7 text-white">
          {codes.join("\n")}
        </pre>
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={() => navigator.clipboard.writeText(codes.join("\n"))}
        >
          <Copy className="h-4 w-4" />
          Copiar códigos
        </Button>
        <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="h-5 w-5"
          />
          Confirmo que guardé los códigos
        </label>
        <Button
          variant="dark"
          className="mt-4 w-full"
          disabled={!confirmed}
          onClick={() => window.location.assign("/admin")}
        >
          <Check className="h-4 w-4" />
          Continuar al panel
        </Button>
      </section>
    );
  return (
    <form
      onSubmit={submit}
      className="w-full rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8"
    >
      <ShieldCheck className="h-10 w-10 text-tech" aria-hidden="true" />
      <h1 className="mt-4 font-display text-3xl font-bold text-primary">Crear administrador</h1>
      <p className="mt-2 text-sm leading-6 text-text-2">
        Inicializa la única cuenta administrativa de este deployment.
      </p>
      <label className="mt-6 block text-sm font-semibold" htmlFor="name">
        Nombre
      </label>
      <input className={field} id="name" name="name" autoComplete="name" required minLength={2} />
      <label className="mt-4 block text-sm font-semibold" htmlFor="email">
        Email
      </label>
      <input
        className={field}
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
      />
      <label className="mt-4 block text-sm font-semibold" htmlFor="password">
        Contraseña
      </label>
      <input
        className={field}
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={14}
        required
      />
      <p className="mt-1 text-xs text-text-2">Mínimo 14 caracteres.</p>
      <label className="mt-4 block text-sm font-semibold" htmlFor="confirmation">
        Confirmar contraseña
      </label>
      <input
        className={field}
        id="confirmation"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        minLength={14}
        required
      />
      <label className="mt-4 block text-sm font-semibold" htmlFor="setupCode">
        Código de instalación
      </label>
      <input
        className={field}
        id="setupCode"
        name="setupCode"
        type="password"
        autoComplete="off"
        minLength={24}
        required
      />
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <Button variant="dark" className="mt-6 w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}Crear cuenta
      </Button>
    </form>
  );
}
