"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  leadSchema,
  painLabels,
  sectorLabels,
  type LeadInput,
} from "@/lib/validations/lead";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type Props = {
  source?: string;
  className?: string;
  compact?: boolean;
};

export function LeadForm({ source = "home", className, compact }: Props) {
  const [done, setDone] = useState(false);
  const [waUrl, setWaUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      source,
      website: "",
      message: "",
    },
  });

  async function onSubmit(data: LeadInput) {
    if (data.website) return; // honeypot

    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      // If the backend is unavailable, still prepare the WhatsApp handoff.
    }

    const url = buildWhatsAppUrl({
      source: data.source ?? source,
      name: data.name,
      business: data.business,
      sector: sectorLabels[data.sector],
      pain: painLabels[data.pain],
      message: data.message || undefined,
    });

    setWaUrl(url);
    setDone(true);
    reset({ source, website: "", message: "" });

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (done) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-lg)] border border-line bg-white p-6 text-center",
          className,
        )}
      >
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
        <h3 className="font-display text-xl font-bold text-primary">
          Listo. Siguiente paso: WhatsApp
        </h3>
        <p className="mt-2 text-sm text-text-2">
          Preparamos tu mensaje. Si no se abrió WhatsApp, usa el enlace de abajo.
          Te respondemos en 24-48 horas laborables.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {waUrl ? (
            <ButtonLink href={waUrl} variant="wa" target="_blank" rel="noopener noreferrer">
              Abrir WhatsApp
            </ButtonLink>
          ) : (
            <p className="text-sm text-mute">
              Configura NEXT_PUBLIC_WHATSAPP_NUMBER para el enlace directo.
            </p>
          )}
          <Button type="button" variant="ghost" onClick={() => setDone(false)}>
            Enviar otro caso
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-white p-5 sm:p-6",
        className,
      )}
      noValidate
    >
      {!compact ? (
        <div className="mb-5">
          <h3 className="font-display text-xl font-bold text-primary">
            Evaluación inicial gratuita
          </h3>
          <p className="mt-1 text-sm text-text-2">
            15 minutos para entender qué se está enredando. Sin compromiso.
            Luego, si aporta, te proponemos un diagnóstico operativo pagado.
          </p>
        </div>
      ) : null}

      {/* honeypot */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
        {...register("website")}
      />
      <input type="hidden" {...register("source")} />

      <div className={cn("grid gap-3", compact ? "sm:grid-cols-1" : "sm:grid-cols-2")}>
        <Field label="Nombre" error={errors.name?.message}>
          <input
            className={inputCls(errors.name)}
            placeholder="Tu nombre"
            {...register("name")}
          />
        </Field>
        <Field label="Negocio" error={errors.business?.message}>
          <input
            className={inputCls(errors.business)}
            placeholder="Nombre del negocio"
            {...register("business")}
          />
        </Field>
        <Field label="Sector" error={errors.sector?.message}>
          <select className={inputCls(errors.sector)} {...register("sector")}>
            <option value="">Selecciona</option>
            {Object.entries(sectorLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="WhatsApp" error={errors.whatsapp?.message}>
          <input
            className={inputCls(errors.whatsapp)}
            placeholder="+1 809 000 0000"
            {...register("whatsapp")}
          />
        </Field>
        <Field
          label="Problema principal"
          error={errors.pain?.message}
          className="sm:col-span-2"
        >
          <select className={inputCls(errors.pain)} {...register("pain")}>
            <option value="">Selecciona</option>
            {Object.entries(painLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Detalle (opcional)"
          error={errors.message?.message}
          className="sm:col-span-2"
        >
          <textarea
            className={cn(inputCls(errors.message), "min-h-[88px] resize-y")}
            placeholder="¿Qué parte del negocio te está costando más tiempo o clientes?"
            {...register("message")}
          />
        </Field>
      </div>

      <Button type="submit" size="lg" className="mt-4 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
          </>
        ) : (
          "Quiero mi evaluación"
        )}
      </Button>
      <p className="mt-3 text-center text-[12.5px] text-mute">
        Al enviar, se abrirá WhatsApp con tu caso. Respuesta inicial en 24-48
        horas laborables.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="mb-1.5 block font-medium text-text">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose">{error}</span> : null}
    </label>
  );
}

function inputCls(error?: { message?: string }) {
  return cn(
    "w-full rounded-[var(--radius-md)] border bg-white px-3 py-2.5 text-sm text-text outline-none transition",
    "placeholder:text-mute focus:border-tech focus:ring-2 focus:ring-larimar/30",
    error ? "border-rose" : "border-line",
  );
}
