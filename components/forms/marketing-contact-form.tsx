"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";

const copy = {
  es: {
    title: "Cuéntanos qué quieres mejorar",
    body: "No necesitas saber qué software comprar. Describe cómo funciona hoy y qué parte te está costando tiempo, clientes o control.",
    name: "Nombre",
    business: "Empresa",
    email: "Correo",
    phone: "Teléfono / WhatsApp",
    interest: "¿Dónde necesitas ayuda?",
    message: "¿Qué está pasando hoy?",
    interests: [
      "Sitio web y SEO",
      "Automatización de procesos",
      "IA para atención y seguimiento",
      "Software o integración a medida",
      "No estoy seguro todavía",
    ],
    submit: "Preparar mensaje",
    note: "Al continuar se abrirá tu aplicación de correo con la información preparada. No enviamos nada sin que lo revises.",
    missing: "Completa nombre, empresa y una breve descripción para continuar.",
  },
  en: {
    title: "Tell us what you want to improve",
    body: "You do not need to know which software to buy. Describe how the business works today and where you are losing time, customers, or visibility.",
    name: "Name",
    business: "Company",
    email: "Email",
    phone: "Phone / WhatsApp",
    interest: "Where do you need help?",
    message: "What is happening today?",
    interests: [
      "Website and SEO",
      "Process automation",
      "AI for customer service and follow-up",
      "Custom software or integration",
      "I am not sure yet",
    ],
    submit: "Prepare message",
    note: "Your email app will open with the information prepared. Nothing is sent until you review it.",
    missing: "Add your name, company, and a short description to continue.",
  },
} as const;

export function MarketingContactForm({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const business = String(form.get("business") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const interest = String(form.get("interest") || "").trim();
    const message = String(form.get("message") || "").trim();

    if (!name || !business || !message) {
      setError(c.missing);
      return;
    }

    setError("");
    const subject =
      locale === "es"
        ? `Consulta de ${business} · QuisqueyaTech`
        : `Inquiry from ${business} · QuisqueyaTech`;
    const body = [
      `${locale === "es" ? "Nombre" : "Name"}: ${name}`,
      `${locale === "es" ? "Empresa" : "Company"}: ${business}`,
      email ? `${locale === "es" ? "Correo" : "Email"}: ${email}` : "",
      phone ? `${locale === "es" ? "Teléfono / WhatsApp" : "Phone / WhatsApp"}: ${phone}` : "",
      interest ? `${locale === "es" ? "Área de interés" : "Area of interest"}: ${interest}` : "",
      "",
      `${locale === "es" ? "Situación actual" : "Current situation"}:`,
      message,
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = `mailto:${brand.publicEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const inputClass =
    "mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-white px-3.5 py-3 text-sm text-text outline-none transition placeholder:text-mute focus:border-tech focus:ring-2 focus:ring-larimar/30";

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-white p-6 shadow-[0_24px_60px_-38px_rgba(8,47,73,.45)] sm:p-7"
      noValidate
    >
      <div className="mb-6">
        <h3 className="font-display text-2xl font-bold text-primary">{c.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-2">{c.body}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-text">
          {c.name}
          <input name="name" autoComplete="name" className={inputClass} required />
        </label>
        <label className="text-sm font-medium text-text">
          {c.business}
          <input name="business" autoComplete="organization" className={inputClass} required />
        </label>
        <label className="text-sm font-medium text-text">
          {c.email}
          <input name="email" type="email" autoComplete="email" className={inputClass} />
        </label>
        <label className="text-sm font-medium text-text">
          {c.phone}
          <input name="phone" type="tel" autoComplete="tel" className={inputClass} />
        </label>
        <label className="text-sm font-medium text-text sm:col-span-2">
          {c.interest}
          <select name="interest" className={inputClass} defaultValue="">
            <option value="" disabled>
              {locale === "es" ? "Selecciona una opción" : "Choose an option"}
            </option>
            {c.interests.map((interest) => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-text sm:col-span-2">
          {c.message}
          <textarea
            name="message"
            rows={5}
            className={`${inputClass} resize-y`}
            placeholder={
              locale === "es"
                ? "Ej.: los leads llegan por WhatsApp e Instagram, pero no tenemos un seguimiento claro y algunos se pierden."
                : "Example: leads arrive through WhatsApp and Instagram, but follow-up is inconsistent and some are getting lost."
            }
            required
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-rose">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-primary-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep focus-visible:ring-offset-2"
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
        {c.submit}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="mt-3 text-center text-xs leading-relaxed text-mute">{c.note}</p>
    </form>
  );
}
