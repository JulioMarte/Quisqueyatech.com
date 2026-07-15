"use client";

// ScheduleModal — the in-flow modal version of the evaluation scheduler.
// Renders into a React Portal so it lives outside any stacking context.
// Connects to the real /api/scheduling/availability and /api/scheduling/book
// endpoints. Falls back to a "pending" submission if the calendar is
// offline (same behavior as the legacy /evaluacion/agendar page).
//
// Design source: docs/modal-versions/v1-dawn.html (the "Dawn / Orquestación"
// mock the brand owner approved).

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarCheck2,
  Check,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { TurnstileField } from "@/components/security/turnstile-field";
import {
  COUNTRIES,
  PHONE_REGEX,
  countryName,
  dialForCountry,
  type ScheduleChannel,
  type ScheduleSlot,
} from "@/lib/scheduling/types";
import { fetchAvailability, submitBooking } from "@/lib/scheduling/api-client";
import { trackSchedule } from "@/lib/scheduling/analytics";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useScheduleModal } from "@/components/evaluation/schedule-modal-context";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "qt:schedule:draft:v1";
const STORAGE_VERSION = 1;

const DEFAULT_TIMES: ReadonlyArray<{ time: string; hour: number; minute: number }> = [
  { time: "9:00 AM", hour: 9, minute: 0 },
  { time: "10:00 AM", hour: 10, minute: 0 },
  { time: "11:00 AM", hour: 11, minute: 0 },
  { time: "12:00 PM", hour: 12, minute: 0 },
  { time: "2:00 PM", hour: 14, minute: 0 },
  { time: "3:00 PM", hour: 15, minute: 0 },
  { time: "4:00 PM", hour: 16, minute: 0 },
  { time: "5:00 PM", hour: 17, minute: 0 },
  { time: "6:00 PM", hour: 18, minute: 0 },
];

function buildStepLabels(es: boolean): Record<number, { eyebrow: string; title: string; sub: string }> {
  return {
    1: {
      eyebrow: es ? "Evaluación inicial gratuita" : "Free initial assessment",
      title: es ? "Cuéntanos de ti y tu empresa" : "Tell us about you and your company",
      sub: es
        ? "Son tres pasos cortos. Lo que compartas nos ayuda a preparar la sesión."
        : "Three short steps. What you share helps us prepare the session.",
    },
    2: {
      eyebrow: es ? "Paso 2 de 3" : "Step 2 of 3",
      title: es ? "Elige un día disponible" : "Pick an available day",
      sub: es
        ? "Los días con punto verde tienen horarios abiertos para tu evaluación."
        : "Days with a green dot have open slots for your assessment.",
    },
    3: {
      eyebrow: es ? "Paso 3 de 3" : "Step 3 of 3",
      title: es ? "Elige la hora" : "Pick a time",
      sub: es
        ? "La sesión dura entre 12 y 15 minutos. Te llamaremos por WhatsApp para confirmar."
        : "The session lasts 12–15 minutes. We'll confirm via WhatsApp.",
    },
    4: {
      eyebrow: es ? "Reserva completada" : "Booking complete",
      title: es ? "¡Listo! Te contactaremos" : "All set! We'll be in touch",
      sub: "",
    },
  };
}

// ---------------------------------------------------------------------------
// Draft (localStorage) for accidental-close recovery
// ---------------------------------------------------------------------------

interface Draft {
  v: number;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  notes: string;
  date?: string;
  time?: string;
}

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (parsed.v !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* storage may be disabled, fail silently */
  }
}

function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// Host — renders the portal target exactly once
// ---------------------------------------------------------------------------

export function ScheduleModalHost() {
  const { isOpen, source, locale, close } = useScheduleModal();
  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- SSR guard */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  if (!mounted) return null;
  return createPortal(
    <ScheduleModalImpl
      isOpen={isOpen}
      source={source}
      locale={locale}
      onClose={close}
    />,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

interface ScheduleModalImplProps {
  isOpen: boolean;
  source: string;
  locale: "es" | "en";
  onClose: () => void;
}

function ScheduleModalImpl({ isOpen, source, locale, onClose }: ScheduleModalImplProps) {
  const es = locale === "es";
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(dialogRef, isOpen);
  useBodyScrollLock(isOpen);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("DO");
  const [notes, setNotes] = useState("");
  const [channel, setChannel] = useState<ScheduleChannel>("web");
  const [consentProcessing, setConsentProcessing] = useState(false);
  const [consentRecording, setConsentRecording] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [availabilityConfigured, setAvailabilityConfigured] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    confirmed: boolean;
    bookingId: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const timezone = useMemo(() => {
    if (typeof Intl === "undefined") return "America/Santo_Domingo";
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/Santo_Domingo";
    }
  }, []);

  // Hydrate from draft on first open. Keeps the user's work if they
  // accidentally closed the modal.
  /* eslint-disable react-hooks/set-state-in-effect -- hydrating from localStorage on open */
  useEffect(() => {
    if (!isOpen) return;
    const draft = loadDraft();
    if (draft) {
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setPhone(draft.phone);
      setCountry(draft.country);
      setNotes(draft.notes);
      if (draft.date) setSelectedDate(draft.date);
      if (draft.time) setSelectedTime(draft.time);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist on every change after step 1.
  useEffect(() => {
    if (!isOpen) return;
    if (step === 4) return;
    saveDraft({
      v: STORAGE_VERSION,
      firstName,
      lastName,
      phone,
      country,
      notes,
      date: selectedDate ?? undefined,
      time: selectedTime ?? undefined,
    });
  }, [isOpen, step, firstName, lastName, phone, country, notes, selectedDate, selectedTime]);

  // Reset full state on close (after the user has seen the success state).
  const reset = useCallback(() => {
    setStep(1);
    setFirstName("");
    setLastName("");
    setPhone("");
    setCountry("DO");
    setNotes("");
    setChannel("web");
    setConsentProcessing(false);
    setConsentRecording(false);
    setTurnstileToken("");
    setSelectedDate(null);
    setSelectedTime(null);
    setCalMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setSlots([]);
    setAvailabilityConfigured(true);
    setError(null);
    setStepError(null);
    setBookingResult(null);
    setSubmitting(false);
    clearDraft();
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) return;
    trackSchedule({
      name: "schedule_modal_closed",
      locale,
      step,
      source,
    });
    onClose();
    // Reset on the next tick so the user does not see the form blank
    // during the close animation.
    window.setTimeout(reset, 250);
  }, [submitting, locale, step, source, onClose, reset]);

  // Open analytics
  useEffect(() => {
    if (!isOpen) return;
    trackSchedule({ name: "schedule_modal_opened", locale, source });
  }, [isOpen, locale, source]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  // Fetch availability when a date is selected
  /* eslint-disable react-hooks/set-state-in-effect -- availability request lifecycle */
  useEffect(() => {
    if (!isOpen || !selectedDate) return;
    const controller = new AbortController();
    setLoadingAvailability(true);
    setStepError(null);
    fetchAvailability(selectedDate, timezone, { signal: controller.signal })
      .then((data) => {
        setSlots(data.slots);
        setAvailabilityConfigured(data.configured);
        if (data.configured && data.slots.length === 0) {
          setStepError(
            es
              ? "No hay espacios disponibles para esta fecha. Prueba otro día."
              : "No slots are available on this date. Try another day.",
          );
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSlots([]);
        setAvailabilityConfigured(false);
      })
      .finally(() => setLoadingAvailability(false));
    return () => controller.abort();
  }, [isOpen, selectedDate, timezone, es]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Validation
  const validateStep = useCallback((): boolean => {
    if (step === 1) {
      if (!firstName.trim() || firstName.trim().length < 2) {
        setStepError(
          es ? "Por favor escribe tu nombre." : "Please enter your first name.",
        );
        return false;
      }
      if (!lastName.trim() || lastName.trim().length < 2) {
        setStepError(
          es ? "Por favor escribe tu apellido." : "Please enter your last name.",
        );
        return false;
      }
      if (!country) {
        setStepError(
          es ? "Selecciona tu país." : "Please select your country.",
        );
        return false;
      }
      if (!PHONE_REGEX.test(phone.replace(/[\s\-()]/g, ""))) {
        setStepError(
          es
            ? "Revisa el número. Usa formato internacional, por ejemplo +18095551234."
            : "Check the number. Use international format, e.g. +18095551234.",
        );
        return false;
      }
      if (!consentProcessing) {
        setStepError(
          es
            ? "Necesitamos tu consentimiento para procesar tus datos."
            : "We need your consent to process your data.",
        );
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!selectedDate) {
        setStepError(
          es ? "Selecciona una fecha disponible." : "Please select an available date.",
        );
        return false;
      }
      if (availabilityConfigured && slots.length === 0) {
        setStepError(
          es
            ? "No hay horarios disponibles para esta fecha."
            : "No slots are available for this date.",
        );
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!selectedTime) {
        setStepError(
          es ? "Selecciona una hora." : "Please select a time.",
        );
        return false;
      }
      return true;
    }
    return true;
  }, [
    step,
    firstName,
    lastName,
    country,
    phone,
    consentProcessing,
    selectedDate,
    selectedTime,
    availabilityConfigured,
    slots.length,
    es,
  ]);

  const submitAll = useCallback(async () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError(null);
    const controller = new AbortController();
    const bookingAttemptId = crypto.randomUUID();

    // Build a real ISO datetime for the selected slot.
    const slot = slots.find((s) => s.label === selectedTime);
    let startIso: string;
    if (slot) {
      startIso = slot.start;
    } else {
      // Offline / pending: synthesize a "preferred time" datetime in the
      // user's timezone.
      const localDate = new Date(`${selectedDate}T12:00:00`);
      const found = DEFAULT_TIMES.find((t) => t.time === selectedTime);
      if (found) {
        localDate.setHours(found.hour, found.minute, 0, 0);
      }
      startIso = localDate.toISOString();
    }

    const result = await submitBooking(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        country,
        phone: phone.replace(/[\s\-()]/g, ""),
        notes: notes.trim() || undefined,
        locale,
        start: startIso,
        timezone,
        channel,
        processingConsent: true,
        recordingConsent: consentRecording,
        turnstileToken: turnstileToken || undefined,
        bookingAttemptId,
      },
      { signal: controller.signal, idempotencyKey: bookingAttemptId },
    );

    setSubmitting(false);

    if (result.ok) {
      setBookingResult({ confirmed: result.confirmed, bookingId: result.bookingId });
      trackSchedule({
        name: "schedule_booking_succeeded",
        locale,
        confirmed: result.confirmed,
        source,
      });
      setStep(4);
      clearDraft();
    } else {
      if (result.code === "slot_unavailable") {
        trackSchedule({
          name: "schedule_slot_unavailable",
          locale,
          date: selectedDate,
          source,
        });
        setStep(2);
        setSelectedTime(null);
        setStepError(
          es
            ? "Ese horario ya fue tomado. Elige otro por favor."
            : "That slot was just taken. Please pick another.",
        );
        return;
      }
      trackSchedule({
        name: "schedule_booking_failed",
        locale,
        code: result.code,
        source,
      });
      setError(result.message);
    }
  }, [
    selectedDate,
    selectedTime,
    slots,
    firstName,
    lastName,
    country,
    phone,
    notes,
    locale,
    timezone,
    channel,
    consentRecording,
    turnstileToken,
    es,
    source,
  ]);

  const goNext = useCallback(async () => {
    if (!validateStep()) return;
    if (step === 3) {
      await submitAll();
      return;
    }
    trackSchedule({ name: "schedule_step_advanced", locale, step, source });
    setStepError(null);
    startTransition(() => setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s)));
  }, [validateStep, step, locale, source, submitAll]);

  const goBack = useCallback(() => {
    trackSchedule({ name: "schedule_step_regressed", locale, step, source });
    setStepError(null);
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s));
  }, [step, locale, source]);

  // Phone helper: when country changes, prepend dial code if empty.
  const onCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setCountry(next);
    if (!phone.trim()) {
      const dial = dialForCountry(next);
      if (dial) setPhone(`${dial} `);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <m.div
          key="schedule-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[1000] flex items-end justify-center p-0 sm:items-center sm:p-4"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label={es ? "Cerrar modal" : "Close modal"}
            className="absolute inset-0 bg-[#08131F]/65 backdrop-blur-md"
            onClick={handleClose}
            tabIndex={-1}
          />

          {/* Dialog */}
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.3, 1] }}
            className={cn(
              "relative z-[1001] flex w-full max-w-[760px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
              "max-h-[95dvh]",
            )}
          >
            <ScheduleModalHeader
              step={step}
              closeRef={closeButtonRef}
              onClose={handleClose}
              titleId={titleId}
              descId={descId}
              locale={locale}
            />

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {step === 1 ? (
                <ContactStep
                  firstName={firstName}
                  lastName={lastName}
                  phone={phone}
                  country={country}
                  notes={notes}
                  channel={channel}
                  consentProcessing={consentProcessing}
                  consentRecording={consentRecording}
                  onFirstNameChange={setFirstName}
                  onLastNameChange={setLastName}
                  onPhoneChange={setPhone}
                  onCountryChange={onCountryChange}
                  onNotesChange={setNotes}
                  onChannelChange={setChannel}
                  onConsentProcessingChange={setConsentProcessing}
                  onConsentRecordingChange={setConsentRecording}
                  locale={locale}
                />
              ) : null}
              {step === 2 ? (
                <CalendarStep
                  calMonth={calMonth}
                  setCalMonth={setCalMonth}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    setSelectedTime(null);
                  }}
                  timezone={timezone}
                  locale={locale}
                />
              ) : null}
              {step === 3 && selectedDate ? (
                <TimeStep
                  date={selectedDate}
                  selectedTime={selectedTime}
                  onSelectTime={setSelectedTime}
                  slots={slots}
                  loading={loadingAvailability}
                  configured={availabilityConfigured}
                  timezone={timezone}
                  locale={locale}
                />
              ) : null}
              {step === 4 && bookingResult ? (
                <SuccessStep
                  firstName={firstName}
                  lastName={lastName}
                  country={country}
                  date={selectedDate!}
                  time={selectedTime!}
                  timezone={timezone}
                  confirmed={bookingResult.confirmed}
                  bookingId={bookingResult.bookingId}
                  locale={locale}
                />
              ) : null}
            </div>

            {step !== 4 ? (
              <ScheduleModalFooter
                step={step}
                submitting={submitting}
                stepError={stepError}
                error={error}
                canGoBack={step > 1}
                onBack={goBack}
                onClose={handleClose}
                onNext={goNext}
                hasTurnstile={Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)}
                onTurnstileToken={setTurnstileToken}
                locale={locale}
              />
            ) : (
              <ScheduleModalSuccessFooter
                onClose={handleClose}
                locale={locale}
              />
            )}
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ScheduleModalHeader({
  step,
  closeRef,
  onClose,
  titleId,
  descId,
  locale,
}: {
  step: number;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  titleId: string;
  descId: string;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const labels = buildStepLabels(es)[step];
  return (
    <div className="relative border-b border-line bg-gradient-to-b from-[#FFFAF0] to-white px-6 pb-4 pt-5 sm:px-7 sm:pt-6">
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={es ? "Cerrar" : "Close"}
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-mute transition hover:bg-bg-2 hover:text-text focus:outline-none focus:ring-2 focus:ring-larimar-deep"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-amber-deep">
        {labels.eyebrow}
      </p>
      <h2
        id={titleId}
        className="mt-1.5 font-display text-[22px] font-bold leading-tight text-primary sm:text-[24px]"
      >
        {labels.title}
      </h2>
      <p id={descId} className="mt-1 text-sm text-text-2">
        {labels.sub}
      </p>
      <Stepper step={step} locale={locale} />
    </div>
  );
}

function Stepper({ step, locale }: { step: number; locale: "es" | "en" }) {
  const es = locale === "es";
  const labels = [
    es ? "Tus datos" : "Your details",
    es ? "Fecha" : "Date",
    es ? "Hora" : "Time",
  ];
  return (
    <ol
      className="mt-5 flex items-center gap-2"
      aria-label={es ? "Progreso" : "Progress"}
    >
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "pending";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[12px] font-bold transition",
                state === "active" && "bg-primary text-white",
                state === "done" && "bg-success-soft text-success",
                state === "pending" && "bg-bg-2 text-mute",
              )}
            >
              {state === "done" ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                n
              )}
            </span>
            <span
              className={cn(
                "hidden text-[12.5px] font-semibold sm:inline",
                state === "active" ? "text-primary" : "text-mute",
              )}
            >
              {label}
            </span>
            {i < labels.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1",
                  n < step ? "bg-success" : "bg-line",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Contact
// ---------------------------------------------------------------------------

interface ContactStepProps {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  notes: string;
  channel: ScheduleChannel;
  consentProcessing: boolean;
  consentRecording: boolean;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onCountryChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onNotesChange: (v: string) => void;
  onChannelChange: (v: ScheduleChannel) => void;
  onConsentProcessingChange: (v: boolean) => void;
  onConsentRecordingChange: (v: boolean) => void;
  locale: "es" | "en";
}

function ContactStep(props: ContactStepProps) {
  const es = props.locale === "es";
  return (
    <form
      className="space-y-4 px-6 py-5 sm:px-7 sm:py-6"
      onSubmit={(e) => e.preventDefault()}
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={es ? "Nombre" : "First name"} required>
          <input
            type="text"
            value={props.firstName}
            onChange={(e) => props.onFirstNameChange(e.target.value)}
            autoComplete="given-name"
            required
            className="qt-input"
            maxLength={60}
          />
        </Field>
        <Field label={es ? "Apellido" : "Last name"} required>
          <input
            type="text"
            value={props.lastName}
            onChange={(e) => props.onLastNameChange(e.target.value)}
            autoComplete="family-name"
            required
            className="qt-input"
            maxLength={80}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={es ? "Celular (con código de país)" : "Mobile (with country code)"}
          required
          hint={es ? "Te contactaremos por WhatsApp a este número." : "We'll reach you on WhatsApp at this number."}
        >
          <input
            type="tel"
            value={props.phone}
            onChange={(e) => props.onPhoneChange(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            required
            placeholder="+1 809 555 1234"
            className="qt-input"
          />
        </Field>
        <Field label={es ? "País" : "Country"} required>
          <select
            value={props.country}
            onChange={props.onCountryChange}
            className="qt-input"
            required
          >
            <option value="" disabled>
              {es ? "Selecciona tu país" : "Select your country"}
            </option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {es ? c.es : c.en}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label={es ? "¿Qué te gustaría resolver?" : "What would you like to solve?"}
        hint={es ? "Opcional. Lo lee el consultor antes de la llamada." : "Optional. Read by the consultant before the call."}
      >
        <textarea
          value={props.notes}
          onChange={(e) => props.onNotesChange(e.target.value)}
          rows={3}
          className="qt-input resize-y"
          placeholder={
            es
              ? "WhatsApp, citas, reportes, Excel…"
              : "WhatsApp, appointments, reports, spreadsheets…"
          }
          maxLength={1000}
        />
      </Field>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-text">
          {es ? "Canal preferido" : "Preferred channel"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ChannelPill
            active={props.channel === "web"}
            onClick={() => props.onChannelChange("web")}
            label={es ? "Navegador" : "Browser"}
            sub={es ? "Evaluación por voz en línea" : "Online voice assessment"}
            icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
          />
          <ChannelPill
            active={props.channel === "phone"}
            onClick={() => props.onChannelChange("phone")}
            label={es ? "Llamada" : "Phone call"}
            sub={es ? "Te llamamos al celular" : "We call your mobile"}
            icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-line bg-bg-2/50 p-4">
        <ConsentCheckbox
          checked={props.consentProcessing}
          onChange={props.onConsentProcessingChange}
          required
          label={
            es
              ? "Acepto el procesamiento de mis datos para gestionar esta evaluación."
              : "I consent to processing my data to manage this assessment."
          }
        />
        <ConsentCheckbox
          checked={props.consentRecording}
          onChange={props.onConsentRecordingChange}
          label={
            es
              ? "Acepto la grabación de la sesión durante un máximo de 30 días."
              : "I consent to recording the session for up to 30 days."
          }
        />
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-text">
        {label}
        {required ? <span className="ml-0.5 text-amber-deep">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-mute">{hint}</span> : null}
    </label>
  );
}

function ChannelPill({
  active,
  onClick,
  label,
  sub,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition",
        active
          ? "border-tech bg-larimar-soft"
          : "border-line bg-white hover:border-tech",
      )}
    >
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
        {icon}
        {label}
      </span>
      <span className="text-[12px] text-mute">{sub}</span>
    </button>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  required,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  label: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-text-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        required={required}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line text-tech focus:ring-tech"
      />
      <span>
        {label}
        {required ? <span className="ml-0.5 text-amber-deep">*</span> : null}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Calendar
// ---------------------------------------------------------------------------

function CalendarStep({
  calMonth,
  setCalMonth,
  selectedDate,
  onSelectDate,
  timezone,
  locale,
}: {
  calMonth: Date;
  setCalMonth: (d: Date) => void;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  timezone: string;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const firstOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  const startDay = firstOfMonth.getDay();
  const last = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
  const daysInMonth = last.getDate();
  const monthName = useMemo(
    () =>
      new Intl.DateTimeFormat(es ? "es" : "en-US", {
        month: "long",
        year: "numeric",
      }).format(calMonth),
    [calMonth, es],
  );
  const dowLabels = es
    ? ["D", "L", "M", "M", "J", "V", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const isPrevDisabled = calMonth <= thisMonth;

  const cells: Array<{ day?: number; date?: Date; key: string }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ key: `pad-${i}` });
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
    cells.push({ day, date: d, key: `d-${day}` });
  }

  const goPrev = () => {
    if (isPrevDisabled) return;
    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  };
  const goNext = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));

  return (
    <div className="px-6 py-5 sm:px-7 sm:py-6">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={isPrevDisabled}
          aria-label={es ? "Mes anterior" : "Previous month"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-text-2 transition hover:bg-bg-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="font-display text-[15px] font-semibold capitalize text-primary">
          {monthName}
        </p>
        <button
          type="button"
          onClick={goNext}
          aria-label={es ? "Mes siguiente" : "Next month"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-text-2 transition hover:bg-bg-2"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-mute">
        {dowLabels.map((d, i) => (
          <div key={i} className="py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="grid">
        {cells.map((cell) => {
          if (!cell.day || !cell.date) {
            return <div key={cell.key} />;
          }
          const d = cell.date;
          const isPast = d < today;
          const isToday = d.getTime() === today.getTime();
          const ds = ymd(d);
          const isSelected = selectedDate === ds;
          return (
            <button
              key={cell.key}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(ds)}
              aria-pressed={isSelected}
              className={cn(
                "relative aspect-square rounded-lg text-[13.5px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-larimar-deep",
                isPast && "cursor-not-allowed text-line-2",
                !isPast && !isSelected && "bg-bg-2 text-text hover:border-tech hover:bg-white hover:ring-1 hover:ring-tech",
                isToday && !isSelected && "ring-1 ring-inset ring-larimar text-amber-deep",
                isSelected && "bg-primary text-white",
              )}
            >
              {cell.day}
              {!isPast ? (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                    isSelected ? "bg-white" : "bg-success",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-mute">
        <Legend dotClass="bg-success" label={es ? "Con disponibilidad" : "Available"} />
        <Legend dotClass="bg-amber-deep" label={es ? "Hoy" : "Today"} />
        <Legend dotClass="bg-primary" label={es ? "Seleccionado" : "Selected"} />
        <Legend dotClass="bg-line-2" label={es ? "Sin disponibilidad" : "Unavailable"} />
      </div>
      <p className="mt-4 text-[12px] text-mute">
        {es ? "Zona horaria:" : "Timezone:"} <span className="font-mono text-text-2">{timezone}</span>
      </p>
    </div>
  );
}

function Legend({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} aria-hidden="true" />
      {label}
    </span>
  );
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Step 3 — Time
// ---------------------------------------------------------------------------

function TimeStep({
  date,
  selectedTime,
  onSelectTime,
  slots,
  loading,
  configured,
  timezone,
  locale,
}: {
  date: string;
  selectedTime: string | null;
  onSelectTime: (label: string) => void;
  slots: ScheduleSlot[];
  loading: boolean;
  configured: boolean;
  timezone: string;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(es ? "es" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(`${date}T12:00:00`));
    } catch {
      return date;
    }
  }, [date, es]);

  // Map server slots to a label->start map. If the server is offline,
  // show the default time grid (all enabled — submission will be pending).
  const slotByLabel = useMemo(() => {
    const m = new Map<string, ScheduleSlot>();
    for (const s of slots) m.set(s.label, s);
    return m;
  }, [slots]);

  const allTimes = useMemo(() => {
    if (!configured) return DEFAULT_TIMES.map((t) => ({ ...t, disabled: false }));
    return DEFAULT_TIMES.map((t) => {
      const found = slotByLabel.get(t.time);
      return { ...t, disabled: Boolean(found === undefined) };
    });
  }, [configured, slotByLabel]);

  return (
    <div className="px-6 py-5 sm:px-7 sm:py-6">
      <p className="mb-3 font-display text-[14.5px] font-semibold capitalize text-primary">
        {dateLabel}
      </p>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-mute">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="ml-2 text-sm">
            {es ? "Cargando horarios..." : "Loading slots..."}
          </span>
        </div>
      ) : !configured ? (
        <div className="mb-4 rounded-xl border border-amber/30 bg-amber-soft p-3 text-[13px] leading-relaxed text-amber-deep">
          {es
            ? "La agenda en vivo no está respondiendo. Tu solicitud quedará pendiente de confirmación."
            : "The live calendar is offline. Your request will remain pending confirmation."}
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {allTimes.map((t) => {
          const isSelected = selectedTime === t.time;
          return (
            <button
              key={t.time}
              type="button"
              disabled={t.disabled}
              onClick={() => onSelectTime(t.time)}
              aria-pressed={isSelected}
              className={cn(
                "min-h-11 rounded-lg border px-3 text-[13.5px] font-semibold transition",
                t.disabled && "cursor-not-allowed border-line bg-bg-2 text-mute line-through",
                !t.disabled && !isSelected && "border-line bg-white text-text hover:border-tech",
                isSelected && "border-tech bg-primary text-white",
              )}
            >
              {t.time}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] text-mute">
        {es ? "Zona horaria:" : "Timezone:"} <span className="font-mono text-text-2">{timezone}</span>
        {!configured ? (
          <span className="ml-2">
            · {es ? "Se enviará como solicitud pendiente" : "Submitted as a pending request"}
          </span>
        ) : null}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Success
// ---------------------------------------------------------------------------

function SuccessStep({
  firstName,
  lastName,
  country,
  date,
  time,
  timezone,
  confirmed,
  bookingId,
  locale,
}: {
  firstName: string;
  lastName: string;
  country: string;
  date: string;
  time: string;
  timezone: string;
  confirmed: boolean;
  bookingId: string;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(es ? "es" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(`${date}T12:00:00`));
    } catch {
      return date;
    }
  }, [date, es]);
  return (
    <div className="px-6 py-8 text-center sm:px-7 sm:py-10">
      <div
        className={cn(
          "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full",
          confirmed ? "bg-success-soft text-success" : "bg-amber-soft text-amber-deep",
        )}
      >
        <CalendarCheck2 className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-mute">
        {confirmed
          ? es ? "Cita confirmada" : "Appointment confirmed"
          : es ? "Solicitud recibida" : "Request received"}
      </p>
      <h3 className="mt-2 font-display text-[26px] font-bold leading-tight text-primary">
        {es ? "¡Listo! Te contactaremos" : "All set! We'll be in touch"}
      </h3>
      <div className="mx-auto mt-4 inline-flex flex-col gap-1 rounded-xl bg-bg-2 px-5 py-3 text-left text-[13.5px] text-text-2">
        <span><strong className="text-primary">{firstName} {lastName}</strong></span>
        <span>{dateLabel} · {time}</span>
        <span>{countryName(country, locale)} · {timezone}</span>
      </div>
      <div className="mx-auto mt-5 max-w-md space-y-2 text-[14.5px] leading-relaxed text-text-2">
        <p>
          {es
            ? "En breve uno de nuestros consultores te contactará por WhatsApp para confirmar la información de tu evaluación."
            : "One of our consultants will reach out via WhatsApp shortly to confirm your assessment details."}
        </p>
        <p>
          {es
            ? <>Te contactaremos <strong>1 día antes</strong> de la sesión para confirmar y compartirte los puntos a tratar.</>
            : <>We&apos;ll reach out <strong>1 day before</strong> the session to confirm and share the talking points.</>}
        </p>
      </div>
      <p className="mt-4 font-mono text-[11px] text-mute">
        {es ? "ID de reserva" : "Booking ID"}: {bookingId}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function ScheduleModalFooter({
  step,
  submitting,
  stepError,
  error,
  canGoBack,
  onBack,
  onClose,
  onNext,
  hasTurnstile,
  onTurnstileToken,
  locale,
}: {
  step: number;
  submitting: boolean;
  stepError: string | null;
  error: string | null;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
  hasTurnstile: boolean;
  onTurnstileToken: (t: string) => void;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const [turnstileKey, setTurnstileKey] = useState(0);
  // re-mount the turnstile when the step changes so the token is per-step
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- force remount of captcha per step
    setTurnstileKey((k) => k + 1);
  }, [step]);
  return (
    <div className="border-t border-line bg-bg-2 px-6 py-4 sm:px-7">
      {step === 3 && hasTurnstile ? (
        <div className="mb-3">
          <TurnstileField key={turnstileKey} onToken={onTurnstileToken} />
        </div>
      ) : null}
      {stepError ? (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg bg-rose-soft p-2.5 text-[13px] text-rose"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {stepError}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg bg-rose-soft p-2.5 text-[13px] text-rose"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || submitting}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13.5px] font-semibold text-text-2 transition hover:border-text-2 disabled:cursor-not-allowed disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {es ? "Atrás" : "Back"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-[13.5px] font-semibold text-text-2 transition hover:bg-white disabled:opacity-50"
          >
            {es ? "Cancelar" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={submitting}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber px-5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : step === 3 ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : null}
            {step === 3
              ? es
                ? "Confirmar evaluación"
                : "Confirm assessment"
              : es
                ? "Continuar"
                : "Continue"}
            {!submitting && step !== 3 ? (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            ) : null}
          </button>
        </div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-mute">
        <Lock className="h-3 w-3" aria-hidden="true" />
        {es
          ? "Tu información está cifrada y solo la usa QuisqueyaTech."
          : "Your information is encrypted and only used by QuisqueyaTech."}
      </p>
    </div>
  );
}

function ScheduleModalSuccessFooter({ onClose, locale }: { onClose: () => void; locale: "es" | "en" }) {
  const es = locale === "es";
  return (
    <div className="border-t border-line bg-bg-2 px-6 py-4 sm:px-7">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-[13.5px] font-semibold text-white transition hover:bg-primary-2"
      >
        {es ? "Cerrar" : "Close"}
      </button>
    </div>
  );
}

// Local class shorthands to keep the markup readable.
const _styles = `
.qt-input {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 11px 13px;
  border: 1.5px solid var(--c-line, #E2E8F0);
  border-radius: 10px;
  font-size: 14.5px;
  font-family: inherit;
  color: var(--c-text, #0F172A);
  background: #fff;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.qt-input:focus {
  outline: none;
  border-color: var(--c-tech, #2563EB);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.qt-input::placeholder { color: var(--c-mute, #64748B); }
textarea.qt-input { min-height: 88px; resize: vertical; }
`;

// Inject the styles once on the client. We keep them inline (rather than
// in globals.css) so this component is fully self-contained and can be
// moved or extracted without touching global styles.
if (typeof document !== "undefined") {
  const id = "qt-schedule-modal-styles";
  if (!document.getElementById(id)) {
    const tag = document.createElement("style");
    tag.id = id;
    tag.appendChild(document.createTextNode(_styles));
    document.head.appendChild(tag);
  }
}
