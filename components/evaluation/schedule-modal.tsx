"use client";

// ScheduleModal — the in-flow modal version of the evaluation scheduler.
// Renders into a React Portal so it lives outside any stacking context.
// Connects to the real /api/scheduling/availability and /api/scheduling/book
// endpoints. A reservation is only offered after live availability has been
// verified; an outage never produces a misleading synthetic appointment.
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
  Phone,
  X,
} from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { TurnstileField, type TurnstileStatus } from "@/components/security/turnstile-field";
import { turnstilePublicConfig } from "@/lib/security/turnstile-config";
import {
  COUNTRIES,
  PHONE_REGEX,
  countryName,
  dialForCountry,
  type ScheduleChannel,
  type ScheduleSlot,
} from "@/lib/scheduling/types";
import { fetchAvailability, submitBooking } from "@/lib/scheduling/api-client";
import { detectBrowserTimeZone, humanTimeZoneLabel } from "@/lib/scheduling/timezone";
import { trackSchedule } from "@/lib/scheduling/analytics";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useScheduleModal } from "@/components/evaluation/schedule-modal-context";
import { cn } from "@/lib/utils";
import { consentLinks } from "@/lib/consent";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "qt:schedule:draft:v1";
const STORAGE_VERSION = 2;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildStepLabels(
  es: boolean,
): Record<number, { eyebrow: string; title: string; sub: string }> {
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
  email: string;
  company: string;
  role: string;
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
    <ScheduleModalImpl isOpen={isOpen} source={source} locale={locale} onClose={close} />,
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

type WizardStep = 1 | 2 | 3 | 4;

type StepValidation = { valid: true } | { valid: false; message: string; target: string };

function ScheduleModalImpl({ isOpen, source, locale, onClose }: ScheduleModalImplProps) {
  const es = locale === "es";
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const submitInFlightRef = useRef(false);
  const stepRef = useRef<WizardStep>(1);
  const availabilityRequestRef = useRef(0);
  const previousTimezoneRef = useRef<string | null>(null);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  useFocusTrap(dialogRef, isOpen);
  useBodyScrollLock(isOpen);

  const [step, setStep] = useState<WizardStep>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("DO");
  const [notes, setNotes] = useState("");
  const [channel, setChannel] = useState<ScheduleChannel>("web");
  const [messagingConsent, setMessagingConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRequired = turnstilePublicConfig().enabled;
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>(
    turnstileRequired ? "loading" : "verified",
  );
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [availabilityConfigured, setAvailabilityConfigured] = useState(true);
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [invalidTarget, setInvalidTarget] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    confirmed: boolean;
    bookingId: string;
    start: string;
    timezone: string;
  } | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Detect on every open so a device whose zone changed while travelling does
  // not reuse an earlier value. Availability remains paused while this is null.
  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => setTimezone(detectBrowserTimeZone()));
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!timezone) return;
    if (previousTimezoneRef.current && previousTimezoneRef.current !== timezone) {
      availabilityRequestRef.current += 1;
      setSlots([]);
      setSelectedTime(null);
      setStepError(null);
    }
    previousTimezoneRef.current = timezone;
  }, [timezone]);

  // Hydrate from draft on first open. Keeps the user's work if they
  // accidentally closed the modal.
  /* eslint-disable react-hooks/set-state-in-effect -- hydrating from localStorage on open */
  useEffect(() => {
    if (!isOpen) return;
    const draft = loadDraft();
    if (draft) {
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setEmail(draft.email);
      setCompany(draft.company);
      setRole(draft.role);
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
      email,
      company,
      role,
      phone,
      country,
      notes,
      date: selectedDate ?? undefined,
      time: selectedTime ?? undefined,
    });
  }, [
    isOpen,
    step,
    firstName,
    lastName,
    email,
    company,
    role,
    phone,
    country,
    notes,
    selectedDate,
    selectedTime,
  ]);

  // Reset full state on close (after the user has seen the success state).
  const reset = useCallback(() => {
    stepRef.current = 1;
    availabilityRequestRef.current += 1;
    setStep(1);
    setFirstName("");
    setLastName("");
    setEmail("");
    setCompany("");
    setRole("");
    setPhone("");
    setCountry("DO");
    setNotes("");
    setChannel("web");
    setMessagingConsent(false);
    setTurnstileToken("");
    setSelectedDate(null);
    setSelectedTime(null);
    setTimezone(null);
    previousTimezoneRef.current = null;
    setCalMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setSlots([]);
    setAvailabilityConfigured(true);
    setAvailabilityRefresh(0);
    setError(null);
    setStepError(null);
    setInvalidTarget(null);
    setBookingResult(null);
    setSubmitting(false);
    submitInFlightRef.current = false;
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

  // Reset the scroll region and announce the new step after navigation.
  useEffect(() => {
    if (!isOpen) return;
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
    const frame = window.requestAnimationFrame(() => {
      titleRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, step]);

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
    if (!isOpen || !selectedDate || !timezone) return;
    const controller = new AbortController();
    const requestId = ++availabilityRequestRef.current;
    setLoadingAvailability(true);
    setStepError(null);
    fetchAvailability(selectedDate, timezone, locale, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted || requestId !== availabilityRequestRef.current) return;
        setSlots(data.slots);
        setAvailabilityConfigured(data.configured);
        if (!data.configured) {
          setStepError(
            es
              ? "No pudimos consultar la agenda en vivo. Reintenta antes de continuar."
              : "We could not reach live scheduling. Retry before continuing.",
          );
          return;
        }
        if (data.configured && data.slots.length === 0) {
          setStepError(
            es
              ? "No hay espacios disponibles para esta fecha. Prueba otro día."
              : "No slots are available on this date. Try another day.",
          );
          return;
        }
        if (stepRef.current === 2) {
          trackSchedule({ name: "schedule_step_advanced", locale, step: 2, source });
          setStepError(null);
          setInvalidTarget(null);
          stepRef.current = 3;
          startTransition(() => setStep(3));
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== availabilityRequestRef.current) return;
        setSlots([]);
        setAvailabilityConfigured(false);
        setStepError(
          es
            ? "No pudimos consultar la agenda en vivo. Reintenta antes de continuar."
            : "We could not reach live scheduling. Retry before continuing.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === availabilityRequestRef.current) {
          setLoadingAvailability(false);
        }
      });
    return () => controller.abort();
  }, [isOpen, selectedDate, timezone, es, locale, source, availabilityRefresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Pure validation keeps rendering side-effect free. Errors are only exposed
  // after the user attempts to navigate or confirm.
  const getStepValidation = useCallback(
    (targetStep: WizardStep): StepValidation => {
      if (targetStep === 1) {
        if (!firstName.trim() || firstName.trim().length < 2) {
          return {
            valid: false,
            message: es ? "Por favor escribe tu nombre." : "Please enter your first name.",
            target: "firstName",
          };
        }
        if (!lastName.trim() || lastName.trim().length < 2) {
          return {
            valid: false,
            message: es ? "Por favor escribe tu apellido." : "Please enter your last name.",
            target: "lastName",
          };
        }
        if (!EMAIL_REGEX.test(email.trim())) {
          return {
            valid: false,
            message: es ? "Escribe un correo electrónico válido." : "Enter a valid email address.",
            target: "email",
          };
        }
        if (!country) {
          return {
            valid: false,
            message: es ? "Selecciona tu país." : "Please select your country.",
            target: "country",
          };
        }
        if (!PHONE_REGEX.test(phone.replace(/[\s\-()]/g, ""))) {
          return {
            valid: false,
            message: es
              ? "Revisa el número. Usa formato internacional, por ejemplo +18095551234."
              : "Check the number. Use international format, e.g. +18095551234.",
            target: "phone",
          };
        }
        return { valid: true };
      }
      if (targetStep === 2) {
        if (!timezone) {
          return {
            valid: false,
            message: es
              ? "Espera mientras detectamos tu zona horaria."
              : "Wait while we detect your timezone.",
            target: "calendar",
          };
        }
        if (!selectedDate) {
          return {
            valid: false,
            message: es ? "Selecciona una fecha disponible." : "Please select an available date.",
            target: "calendar",
          };
        }
        if (loadingAvailability) {
          return {
            valid: false,
            message: es
              ? "Espera mientras verificamos los horarios."
              : "Wait while we check the available times.",
            target: "calendar",
          };
        }
        if (!availabilityConfigured) {
          return {
            valid: false,
            message: es
              ? "La agenda en vivo no está disponible. Reintenta para continuar."
              : "Live scheduling is unavailable. Retry to continue.",
            target: "calendar",
          };
        }
        if (slots.length === 0) {
          return {
            valid: false,
            message: es
              ? "No hay horarios disponibles para esta fecha."
              : "No slots are available for this date.",
            target: "calendar",
          };
        }
        return { valid: true };
      }
      if (targetStep === 3 && !selectedTime) {
        return {
          valid: false,
          message: es ? "Selecciona una hora." : "Please select a time.",
          target: "timeGrid",
        };
      }
      return { valid: true };
    },
    [
      firstName,
      lastName,
      email,
      country,
      phone,
      selectedDate,
      selectedTime,
      availabilityConfigured,
      loadingAvailability,
      slots.length,
      timezone,
      es,
    ],
  );

  const focusInvalidTarget = useCallback(
    (target: string) => {
      window.requestAnimationFrame(() => {
        const element = dialogRef.current?.querySelector<HTMLElement>(
          `[data-schedule-target="${target}"]`,
        );
        element?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
        element?.focus({ preventScroll: true });
      });
    },
    [reduceMotion],
  );

  const validateCurrentStep = useCallback((): boolean => {
    const result = getStepValidation(step);
    if (result.valid) {
      setStepError(null);
      setInvalidTarget(null);
      return true;
    }
    setStepError(result.message);
    setInvalidTarget(result.target);
    focusInvalidTarget(result.target);
    return false;
  }, [focusInvalidTarget, getStepValidation, step]);

  const submitAll = useCallback(async () => {
    if (!selectedDate || !selectedTime || !timezone) return;
    if (turnstileRequired && turnstileStatus !== "verified") return;
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    const controller = new AbortController();
    const bookingAttemptId = crypto.randomUUID();

    // A booking must always refer to a server-provided live slot.
    const slot = slots.find((s) => s.label === selectedTime);
    if (!availabilityConfigured || !slot) {
      setSubmitting(false);
      submitInFlightRef.current = false;
      setStepError(
        es
          ? "Ese horario ya no está verificado. Reintenta y elige un horario disponible."
          : "That time is no longer verified. Retry and choose an available slot.",
      );
      stepRef.current = 2;
      setStep(2);
      setSelectedTime(null);
      return;
    }
    const startIso = slot.start;

    const result = await submitBooking(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        company: company.trim() || undefined,
        role: role.trim() || undefined,
        country,
        phone: phone.replace(/[\s\-()]/g, ""),
        notes: notes.trim() || undefined,
        locale,
        start: startIso,
        timezone,
        channel,
        messagingConsent,
        turnstileToken: turnstileToken || undefined,
        bookingAttemptId,
      },
      { signal: controller.signal, idempotencyKey: bookingAttemptId },
    );

    setSubmitting(false);
    submitInFlightRef.current = false;

    if (result.ok) {
      setBookingResult({
        confirmed: result.confirmed,
        bookingId: result.bookingId,
        start: startIso,
        timezone,
      });
      trackSchedule({
        name: "schedule_booking_succeeded",
        locale,
        confirmed: result.confirmed,
        source,
      });
      stepRef.current = 4;
      setStep(4);
      clearDraft();
    } else {
      setTurnstileToken("");
      setTurnstileResetSignal((value) => value + 1);
      if (result.code === "validation" && result.field) {
        stepRef.current = 1;
        setStep(1);
        setInvalidTarget(result.field);
        setStepError(result.message);
        return;
      }
      if (result.code === "slot_unavailable") {
        trackSchedule({
          name: "schedule_slot_unavailable",
          locale,
          date: selectedDate,
          source,
        });
        stepRef.current = 2;
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
    availabilityConfigured,
    firstName,
    lastName,
    email,
    company,
    role,
    country,
    phone,
    notes,
    locale,
    timezone,
    channel,
    messagingConsent,
    turnstileToken,
    es,
    source,
    turnstileRequired,
    turnstileStatus,
  ]);

  const goNext = useCallback(async () => {
    if (!validateCurrentStep()) return;
    if (step === 3) {
      await submitAll();
      return;
    }
    trackSchedule({ name: "schedule_step_advanced", locale, step, source });
    setStepError(null);
    stepRef.current = (step + 1) as WizardStep;
    startTransition(() => setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s)));
  }, [validateCurrentStep, step, locale, source, submitAll]);

  const goBack = useCallback(() => {
    trackSchedule({ name: "schedule_step_regressed", locale, step, source });
    setStepError(null);
    setInvalidTarget(null);
    const target = (step > 1 ? step - 1 : step) as WizardStep;
    stepRef.current = target;
    setStep(target);
  }, [step, locale, source]);

  // Wizard step navigation via step pills or side arrows.
  // Rules:
  //  - Can always go BACK to a previous step (to edit).
  //  - Can attempt the immediately-next step; validation runs on interaction.
  //  - Cannot skip steps.
  //  - Cannot navigate to the success step (4) directly.
  const canNavigateToStep = useCallback(
    (target: WizardStep): boolean => {
      if (step === 4) return false;
      if (target === step) return false;
      if (target === 4) return false; // success is reached only via submit
      if (target < step) return true; // any previous step
      if (target === step + 1) return true;
      return false; // skipping steps not allowed
    },
    [step],
  );

  const onStepClick = useCallback(
    (target: WizardStep) => {
      if (step === 4) return;
      if (target === step) return;
      if (target < step) {
        trackSchedule({ name: "schedule_step_regressed", locale, step: target, source });
        setStepError(null);
        setInvalidTarget(null);
        stepRef.current = target;
        setStep(target);
        return;
      }
      if (target === step + 1) {
        if (!validateCurrentStep()) return;
        trackSchedule({ name: "schedule_step_advanced", locale, step, source });
        setStepError(null);
        setInvalidTarget(null);
        stepRef.current = target;
        setStep(target);
      }
    },
    [step, locale, source, validateCurrentStep],
  );

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
          transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
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
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.2, 0.7, 0.3, 1] }}
            className="relative z-[1001] w-full max-w-[680px] overflow-visible"
          >
            {/* Side navigation arrows only appear when the viewport leaves safe gutters. */}
            {step > 1 && step < 4 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                aria-label={es ? "Paso anterior" : "Previous step"}
                className={cn(
                  "absolute -left-[124px] top-1/2 z-10 hidden h-11 min-w-[112px] -translate-y-1/2 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-white/80 bg-white px-3 text-[12.5px] font-bold text-primary shadow-xl transition-colors lg:flex",
                  "hover:border-tech hover:text-tech focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
                )}
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                <span>
                  {step === 3 ? (es ? "Fecha" : "Date") : es ? "Tus datos" : "Your details"}
                </span>
              </button>
            ) : null}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={
                  submitting ||
                  (loadingAvailability && step === 2) ||
                  (step === 3 &&
                    (!selectedTime || (turnstileRequired && turnstileStatus !== "verified")))
                }
                aria-label={
                  step === 3
                    ? es
                      ? "Confirmar evaluación"
                      : "Confirm assessment"
                    : es
                      ? "Siguiente paso"
                      : "Next step"
                }
                className={cn(
                  "absolute -right-[124px] top-1/2 z-10 hidden h-11 min-w-[112px] -translate-y-1/2 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 text-[12.5px] font-bold text-white shadow-xl transition-colors lg:flex",
                  step === 3
                    ? "border-amber bg-amber hover:border-amber-deep hover:bg-amber-deep"
                    : "border-primary bg-primary hover:border-tech hover:bg-primary-2",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                <span>
                  {step === 1
                    ? es
                      ? "Fecha"
                      : "Date"
                    : step === 2
                      ? es
                        ? "Hora"
                        : "Time"
                      : es
                        ? "Confirmar"
                        : "Confirm"}
                </span>
                {!submitting ? (
                  step === 3 ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  )
                ) : null}
              </button>
            ) : null}

            <div className="flex max-h-[95dvh] min-h-0 flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl">
              <ScheduleModalHeader
                step={step}
                titleRef={titleRef}
                closeRef={closeButtonRef}
                onClose={handleClose}
                titleId={titleId}
                descId={descId}
                locale={locale}
                canNavigateToStep={canNavigateToStep}
                onStepClick={onStepClick}
              />

              <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {step < 4 && (stepError || error) ? (
                  <div className="hidden px-6 pt-4 lg:block">
                    <p
                      role="alert"
                      className="flex items-start gap-2 rounded-lg bg-rose-soft p-2.5 text-[13px] text-rose"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {stepError || error}
                    </p>
                  </div>
                ) : null}
                {step === 1 ? (
                  <ContactStep
                    firstName={firstName}
                    lastName={lastName}
                    email={email}
                    company={company}
                    role={role}
                    phone={phone}
                    country={country}
                    notes={notes}
                    channel={channel}
                    messagingConsent={messagingConsent}
                    onFirstNameChange={setFirstName}
                    onLastNameChange={setLastName}
                    onEmailChange={setEmail}
                    onCompanyChange={setCompany}
                    onRoleChange={setRole}
                    onPhoneChange={setPhone}
                    onCountryChange={onCountryChange}
                    onNotesChange={setNotes}
                    onChannelChange={setChannel}
                    onMessagingConsentChange={setMessagingConsent}
                    invalidTarget={invalidTarget}
                    locale={locale}
                  />
                ) : null}
                {step === 2 && timezone ? (
                  <CalendarStep
                    calMonth={calMonth}
                    setCalMonth={setCalMonth}
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                      if (d === selectedDate) return;
                      setSlots([]);
                      setLoadingAvailability(true);
                      setSelectedDate(d);
                      setSelectedTime(null);
                      setStepError(null);
                      setInvalidTarget(null);
                    }}
                    timezone={timezone}
                    invalid={invalidTarget === "calendar"}
                    unavailable={!availabilityConfigured}
                    loading={loadingAvailability}
                    onRetry={() => {
                      setSlots([]);
                      setSelectedTime(null);
                      setStepError(null);
                      setAvailabilityConfigured(true);
                      setAvailabilityRefresh((value) => value + 1);
                    }}
                    locale={locale}
                  />
                ) : step === 2 ? (
                  <div
                    className="flex min-h-72 items-center justify-center gap-2 text-sm text-mute"
                    role="status"
                  >
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    {es ? "Detectando tu zona horaria..." : "Detecting your timezone..."}
                  </div>
                ) : null}
                {step === 3 && selectedDate && timezone ? (
                  <>
                    <TimeStep
                      date={selectedDate}
                      selectedTime={selectedTime}
                      onSelectTime={(time) => {
                        setSelectedTime(time);
                        setStepError(null);
                        setInvalidTarget(null);
                      }}
                      slots={slots}
                      loading={loadingAvailability}
                      configured={availabilityConfigured}
                      timezone={timezone}
                      invalid={invalidTarget === "timeGrid"}
                      locale={locale}
                    />
                    {turnstileRequired ? (
                      <div className="px-5 pb-4 sm:px-7 lg:px-6">
                        <TurnstileField
                          action="scheduling_book"
                          locale={locale}
                          onToken={setTurnstileToken}
                          onStatus={setTurnstileStatus}
                          resetSignal={turnstileResetSignal}
                          tone="light"
                        />
                        {turnstileStatus === "loading" ? (
                          <p className="mt-2 text-sm text-mute" role="status">
                            {es ? "Cargando verificación segura…" : "Loading secure verification…"}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {step === 4 && bookingResult ? (
                  <SuccessStep
                    firstName={firstName}
                    lastName={lastName}
                    country={country}
                    start={bookingResult.start}
                    timezone={bookingResult.timezone}
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
                  nextDisabled={
                    (step === 2 &&
                      (!selectedDate ||
                        loadingAvailability ||
                        !availabilityConfigured ||
                        slots.length === 0)) ||
                    (step === 3 &&
                      (!selectedTime ||
                        !availabilityConfigured ||
                        (turnstileRequired && turnstileStatus !== "verified")))
                  }
                  readyToConfirm={step === 3 && Boolean(selectedTime)}
                  locale={locale}
                />
              ) : (
                <ScheduleModalSuccessFooter onClose={handleClose} locale={locale} />
              )}
            </div>
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
  titleRef,
  closeRef,
  onClose,
  titleId,
  descId,
  locale,
  canNavigateToStep,
  onStepClick,
}: {
  step: WizardStep;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  titleId: string;
  descId: string;
  locale: "es" | "en";
  canNavigateToStep: (target: WizardStep) => boolean;
  onStepClick: (target: WizardStep) => void;
}) {
  const es = locale === "es";
  const labels = buildStepLabels(es)[step];
  return (
    <div className="relative flex-none border-b border-line bg-gradient-to-b from-[#FFFAF0] to-white px-5 pb-3 pt-4 sm:px-7 sm:pb-4 sm:pt-5 lg:px-6 lg:pb-3 lg:pt-4">
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={es ? "Cerrar" : "Close"}
        className="absolute right-3 top-3 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-white text-mute transition-colors hover:bg-bg-2 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep motion-reduce:transition-none sm:right-4 sm:top-4"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-amber-deep">
        {labels.eyebrow}
      </p>
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        style={{ outline: "none" }}
        className="mt-1.5 pr-12 font-display text-[21px] font-bold leading-tight text-primary outline-none sm:text-[24px] lg:text-[22px]"
      >
        {labels.title}
      </h2>
      <p id={descId} className="mt-1 text-sm text-text-2">
        {labels.sub}
      </p>
      {step < 4 ? (
        <Stepper
          step={step}
          locale={locale}
          canNavigateToStep={canNavigateToStep}
          onStepClick={onStepClick}
        />
      ) : null}
    </div>
  );
}

function Stepper({
  step,
  locale,
  canNavigateToStep,
  onStepClick,
}: {
  step: WizardStep;
  locale: "es" | "en";
  canNavigateToStep: (target: WizardStep) => boolean;
  onStepClick: (target: WizardStep) => void;
}) {
  const es = locale === "es";
  const labels = [es ? "Tus datos" : "Your details", es ? "Fecha" : "Date", es ? "Hora" : "Time"];
  return (
    <ol
      className="mx-auto mt-3 grid w-full max-w-[480px] grid-cols-3 gap-2 lg:hidden"
      aria-label={es ? "Progreso" : "Progress"}
    >
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "pending";
        const target = n as WizardStep;
        const clickable = canNavigateToStep(target);
        return (
          <li key={label} className="relative flex min-w-0 justify-center">
            {i < labels.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[calc(50%+22px)] right-[calc(-50%+30px)] top-5 h-0.5",
                  n < step ? "bg-success" : "bg-line",
                )}
              />
            ) : null}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick(target)}
              aria-label={es ? `Ir al paso ${n}: ${label}` : `Go to step ${n}: ${label}`}
              aria-current={state === "active" ? "step" : undefined}
              className={cn(
                "group relative z-[1] inline-flex min-h-[52px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 text-center shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep motion-reduce:transition-none",
                state === "active" && "border-primary bg-primary text-white shadow-md",
                state === "done" && "border-success/30 bg-success-soft text-success",
                state === "pending" &&
                  clickable &&
                  "border-tech/50 bg-white text-primary hover:border-tech hover:bg-larimar-soft",
                state === "pending" && !clickable && "border-line bg-bg-2 text-mute opacity-80",
                clickable ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11.5px] font-bold transition-colors motion-reduce:transition-none",
                  state === "active" && "border-white/30 bg-white/15 text-white",
                  state === "done" && "border-success/20 bg-white/70 text-success",
                  state === "pending" && clickable && "border-tech/30 bg-larimar-soft text-primary",
                  state === "pending" && !clickable && "border-line bg-white text-mute",
                )}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span
                className={cn(
                  "truncate text-[11.5px] font-bold sm:text-[12px]",
                  state === "active" ? "text-white" : "text-current",
                )}
              >
                {label}
              </span>
              <span className="sr-only">
                {state === "done" ? (es ? "Completado" : "Completed") : null}
              </span>
            </button>
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
  email: string;
  company: string;
  role: string;
  phone: string;
  country: string;
  notes: string;
  channel: ScheduleChannel;
  messagingConsent: boolean;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onCountryChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onNotesChange: (v: string) => void;
  onChannelChange: (v: ScheduleChannel) => void;
  onMessagingConsentChange: (v: boolean) => void;
  invalidTarget: string | null;
  locale: "es" | "en";
}

function ContactStep(props: ContactStepProps) {
  const es = props.locale === "es";
  return (
    <form
      className="space-y-3 px-5 py-4 sm:px-7 sm:py-5 lg:space-y-2.5 lg:px-6 lg:py-4"
      onSubmit={(e) => e.preventDefault()}
      noValidate
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={es ? "Nombre" : "First name"} required>
          <input
            type="text"
            value={props.firstName}
            onChange={(e) => props.onFirstNameChange(e.target.value)}
            autoComplete="given-name"
            required
            data-schedule-target="firstName"
            aria-invalid={props.invalidTarget === "firstName"}
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
            data-schedule-target="lastName"
            aria-invalid={props.invalidTarget === "lastName"}
            className="qt-input"
            maxLength={80}
          />
        </Field>
      </div>
      <Field
        label={es ? "Correo electrónico" : "Email address"}
        required
        hint={
          es
            ? "Recibirás aquí la confirmación de la cita."
            : "Your appointment confirmation will be sent here."
        }
      >
        <input
          type="email"
          value={props.email}
          onChange={(e) => props.onEmailChange(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
          data-schedule-target="email"
          aria-invalid={props.invalidTarget === "email"}
          className="qt-input"
          maxLength={160}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={es ? "Empresa" : "Company"} hint={es ? "Opcional" : "Optional"}>
          <input
            type="text"
            value={props.company}
            onChange={(e) => props.onCompanyChange(e.target.value)}
            autoComplete="organization"
            className="qt-input"
            maxLength={120}
          />
        </Field>
        <Field label={es ? "Cargo" : "Role"} hint={es ? "Opcional" : "Optional"}>
          <input
            type="text"
            value={props.role}
            onChange={(e) => props.onRoleChange(e.target.value)}
            autoComplete="organization-title"
            className="qt-input"
            maxLength={100}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label={es ? "Celular (con código de país)" : "Mobile (with country code)"}
          required
          hint={
            es
              ? "Te contactaremos por WhatsApp a este número."
              : "We'll reach you on WhatsApp at this number."
          }
        >
          <input
            type="tel"
            value={props.phone}
            onChange={(e) => props.onPhoneChange(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            required
            data-schedule-target="phone"
            aria-invalid={props.invalidTarget === "phone"}
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
            data-schedule-target="country"
            aria-invalid={props.invalidTarget === "country"}
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
        hint={
          es
            ? "Opcional. Lo lee el consultor antes de la llamada."
            : "Optional. Read by the consultant before the call."
        }
      >
        <textarea
          value={props.notes}
          onChange={(e) => props.onNotesChange(e.target.value)}
          rows={2}
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
        <p className="mb-1.5 text-[13px] font-semibold text-text">
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
            icon={<Phone className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-line bg-bg-2/50 p-3 lg:p-2.5">
        <ConsentCheckbox
          checked={props.messagingConsent}
          onChange={props.onMessagingConsentChange}
          target="messagingConsent"
          label={
            <>
              {es
                ? "Acepto recibir de QuisqueyaTech confirmaciones, recordatorios, cambios y otros mensajes relacionados con mi cita por SMS y WhatsApp en el número indicado. La frecuencia varía. Pueden aplicar tarifas de mensajes y datos. Para SMS, responde STOP para cancelar y HELP para obtener ayuda. En WhatsApp puedo solicitar dejar de recibir mensajes en cualquier momento. No es necesario aceptar para agendar; si no acepto, recibiré las comunicaciones por correo electrónico. Consulta los "
                : "I agree to receive appointment confirmations, reminders, changes, and other appointment-related messages from QuisqueyaTech by SMS and WhatsApp at the number provided. Message frequency varies. Message and data rates may apply. For SMS, reply STOP to opt out and HELP for help. On WhatsApp, I may ask QuisqueyaTech to stop messaging me at any time. Consent is not required to book; if I do not agree, communications will be sent by email. See the "}
              <a
                href={consentLinks.messagingTerms(props.locale)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-tech underline"
              >
                {es ? "Términos de mensajería" : "Messaging Terms"}
              </a>
              {es ? " y la " : " and "}
              <a
                href={consentLinks.privacy(props.locale)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-tech underline"
              >
                {es ? "Política de privacidad" : "Privacy Policy"}
              </a>
              .
            </>
          }
        />
        <p className="text-[12px] leading-relaxed text-mute">
          {es
            ? "Usaremos los datos proporcionados para gestionar tu solicitud y la cita. Consulta cómo protegemos y conservamos tu información en nuestra "
            : "We use the information provided to manage your request and appointment. Learn how we protect and retain it in our "}
          <a
            href={consentLinks.privacy(props.locale)}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-tech underline"
          >
            {es ? "Política de privacidad" : "Privacy Policy"}
          </a>
          .
        </p>
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
  label: React.ReactNode;
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
  label: React.ReactNode;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 cursor-pointer flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep motion-reduce:transition-none lg:p-2.5",
        active ? "border-tech bg-larimar-soft" : "border-line bg-white hover:border-tech",
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
  target,
  invalid,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  target?: string;
  invalid?: boolean;
  label: React.ReactNode;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] text-text-2"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        required={required}
        data-schedule-target={target}
        aria-invalid={invalid}
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
  invalid,
  unavailable,
  loading,
  onRetry,
  locale,
}: {
  calMonth: Date;
  setCalMonth: (d: Date) => void;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  timezone: string;
  invalid: boolean;
  unavailable: boolean;
  loading: boolean;
  onRetry: () => void;
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
  const dowLabels = es ? ["D", "L", "M", "M", "J", "V", "S"] : ["S", "M", "T", "W", "T", "F", "S"];

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
    <div
      data-schedule-target="calendar"
      tabIndex={-1}
      aria-invalid={invalid}
      className="px-5 py-4 outline-none sm:px-7 sm:py-5 lg:px-6 lg:py-4"
    >
      {unavailable ? (
        <div
          className="mb-4 rounded-xl border border-amber/30 bg-amber-soft p-4 text-sm text-amber-deep"
          role="alert"
        >
          <p>
            {es
              ? "No se pudo verificar la disponibilidad en vivo. No reservaremos un horario sin confirmarlo primero."
              : "Live availability could not be verified. We will not book a time before confirming it."}
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-amber-deep/30 bg-white px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {es ? "Reintentar" : "Retry"}
          </button>
        </div>
      ) : null}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={isPrevDisabled}
          aria-label={es ? "Mes anterior" : "Previous month"}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-line bg-white text-text-2 transition-colors hover:bg-bg-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
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
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-line bg-white text-text-2 transition-colors hover:bg-bg-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep motion-reduce:transition-none"
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
                "relative aspect-square cursor-pointer rounded-lg text-[13.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep motion-reduce:transition-none",
                isPast && "cursor-not-allowed text-line-2",
                !isPast &&
                  !isSelected &&
                  "bg-bg-2 text-text hover:border-tech hover:bg-white hover:ring-1 hover:ring-tech",
                isToday && !isSelected && "ring-1 ring-inset ring-larimar text-amber-deep",
                isSelected && "bg-primary text-white",
              )}
            >
              {cell.day}
              {isSelected ? (
                <span
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-mute">
        <Legend dotClass="bg-amber-deep" label={es ? "Hoy" : "Today"} />
        <Legend dotClass="bg-primary" label={es ? "Seleccionado" : "Selected"} />
        <Legend dotClass="bg-line-2" label={es ? "Consulta al elegir" : "Checked when selected"} />
      </div>
      <p className="mt-4 text-[12px] text-mute">
        {es ? "Horarios en " : "Times in "}
        <span className="font-medium text-text-2">
          {humanTimeZoneLabel(
            timezone,
            selectedDate ? `${selectedDate}T12:00:00Z` : calMonth,
            locale,
          )}
        </span>
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
  invalid,
  locale,
}: {
  date: string;
  selectedTime: string | null;
  onSelectTime: (label: string) => void;
  slots: ScheduleSlot[];
  loading: boolean;
  configured: boolean;
  timezone: string;
  invalid: boolean;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const wheelRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelGestureRef = useRef<{ direction: -1 | 1; at: number } | null>(null);
  const programmaticScrollUntilRef = useRef(0);
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
  const allTimes = useMemo(() => {
    return slots.map((slot) => ({ time: slot.label, disabled: false }));
  }, [slots]);
  const timezoneInstant =
    slots.find((slot) => slot.label === selectedTime)?.start ??
    slots[0]?.start ??
    `${date}T12:00:00Z`;
  const timezoneLabel = humanTimeZoneLabel(timezone, timezoneInstant, locale);

  useEffect(
    () => () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    },
    [],
  );

  const centerOption = useCallback((element: HTMLButtonElement, behavior: ScrollBehavior) => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const top = element.offsetTop + element.offsetHeight / 2 - wheel.clientHeight / 2;
    wheel.scrollTo({ top: Math.max(0, top), behavior });
  }, []);

  const settleWheel = useCallback(() => {
    if (performance.now() < programmaticScrollUntilRef.current) return;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const wheel = wheelRef.current;
      if (!wheel) return;
      const center = wheel.getBoundingClientRect().top + wheel.clientHeight / 2;
      const options = Array.from(wheel.querySelectorAll<HTMLButtonElement>("button[data-time]"));
      const nearest = options.reduce<HTMLButtonElement | null>((best, option) => {
        if (!best) return option;
        const optionCenter = option.getBoundingClientRect().top + option.offsetHeight / 2;
        const bestCenter = best.getBoundingClientRect().top + best.offsetHeight / 2;
        return Math.abs(optionCenter - center) < Math.abs(bestCenter - center) ? option : best;
      }, null);
      const value = nearest?.dataset.time;
      if (!nearest || !value) return;
      programmaticScrollUntilRef.current = performance.now() + 400;
      centerOption(nearest, "auto");
      if (value !== selectedTime) onSelectTime(value);
    }, 90);
  }, [centerOption, onSelectTime, selectedTime]);

  const chooseTime = useCallback(
    (time: string, element: HTMLButtonElement, behavior: ScrollBehavior = "auto") => {
      programmaticScrollUntilRef.current = performance.now() + 400;
      onSelectTime(time);
      centerOption(element, behavior);
    },
    [centerOption, onSelectTime],
  );

  const moveSelection = useCallback(
    (direction: -1 | 1 | "first" | "last", behavior: ScrollBehavior = "auto") => {
      const wheel = wheelRef.current;
      if (!wheel) return;
      const options = Array.from(
        wheel.querySelectorAll<HTMLButtonElement>("button[data-time]:not(:disabled)"),
      );
      if (!options.length) return;
      const current = Math.max(
        0,
        options.findIndex((option) => option.dataset.time === selectedTime),
      );
      const next =
        direction === "first"
          ? 0
          : direction === "last"
            ? options.length - 1
            : Math.min(options.length - 1, Math.max(0, current + direction));
      const option = options[next];
      chooseTime(option.dataset.time!, option, behavior);
      option.focus({ preventScroll: true });
    },
    [chooseTime, selectedTime],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX) || event.deltaY === 0) return;
      event.preventDefault();
      const direction: -1 | 1 = event.deltaY < 0 ? -1 : 1;
      const now = performance.now();
      const previous = wheelGestureRef.current;
      // Trackpads emit several wheel events for one gesture. Collapse events in
      // the same direction, but never lock an immediate reversal.
      if (previous?.direction === direction && now - previous.at < 140) return;
      wheelGestureRef.current = { direction, at: now };
      moveSelection(direction, "smooth");
    },
    [moveSelection],
  );

  const onWheelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1);
      } else if (event.key === "Home") {
        event.preventDefault();
        moveSelection("first");
      } else if (event.key === "End") {
        event.preventDefault();
        moveSelection("last");
      }
    },
    [moveSelection],
  );

  return (
    <div
      data-schedule-target="timeGrid"
      tabIndex={-1}
      aria-invalid={invalid}
      className="px-5 py-4 outline-none sm:px-7 sm:py-5 lg:px-6 lg:py-4"
    >
      <p className="mb-3 font-display text-[14.5px] font-semibold capitalize text-primary">
        {dateLabel}
      </p>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-mute">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="ml-2 text-sm">{es ? "Cargando horarios..." : "Loading slots..."}</span>
        </div>
      ) : !configured ? (
        <div className="mb-4 rounded-xl border border-amber/30 bg-amber-soft p-3 text-[13px] leading-relaxed text-amber-deep">
          {es
            ? "La agenda en vivo no está respondiendo. Vuelve a la fecha y reintenta."
            : "Live scheduling is offline. Return to the date and retry."}
        </div>
      ) : null}
      {!loading ? (
        <div
          className="relative mx-auto max-w-sm"
          role="group"
          aria-label={es ? "Horarios disponibles" : "Available times"}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-14 -translate-y-1/2 rounded-xl border border-tech/35 bg-larimar/10 shadow-[0_8px_24px_rgba(13,54,80,0.08)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-white via-white/80 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-white via-white/80 to-transparent"
          />
          <div
            ref={wheelRef}
            data-testid="time-wheel"
            onWheel={onWheel}
            onScroll={settleWheel}
            onKeyDown={onWheelKeyDown}
            tabIndex={0}
            className="relative h-56 overflow-y-auto overscroll-contain scroll-smooth px-2 py-[84px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="space-y-2">
              {allTimes.map((t) => {
                const isSelected = selectedTime === t.time;
                return (
                  <button
                    key={t.time}
                    data-time={t.time}
                    type="button"
                    disabled={t.disabled}
                    onClick={(event) => chooseTime(t.time, event.currentTarget)}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative z-10 mx-auto flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl px-4 text-lg font-semibold transition-[color,opacity] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep motion-reduce:scroll-auto motion-reduce:transition-none",
                      isSelected
                        ? "text-primary"
                        : "text-mute opacity-65 hover:text-text hover:opacity-100",
                      t.disabled && "cursor-not-allowed line-through opacity-35",
                    )}
                  >
                    {t.time}
                    <span className="sr-only">
                      {isSelected ? (es ? ", seleccionado" : ", selected") : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-1 text-center text-xs text-mute">
            {es ? "Desliza para elegir una hora" : "Scroll to choose a time"}
          </p>
        </div>
      ) : null}
      <p className="mt-4 text-[12px] text-mute">
        {es ? "Horarios en " : "Times in "}
        <span className="font-medium text-text-2">{timezoneLabel}</span>
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
  start,
  timezone,
  confirmed,
  bookingId,
  locale,
}: {
  firstName: string;
  lastName: string;
  country: string;
  start: string;
  timezone: string;
  confirmed: boolean;
  bookingId: string;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const appointmentLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(es ? "es" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(start));
    } catch {
      return start;
    }
  }, [es, start, timezone]);
  const timezoneLabel = humanTimeZoneLabel(timezone, start, locale);
  return (
    <div className="px-6 py-8 text-center sm:px-7 sm:py-10 lg:py-8">
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
          ? es
            ? "Cita confirmada"
            : "Appointment confirmed"
          : es
            ? "Solicitud recibida"
            : "Request received"}
      </p>
      <h3 className="mt-2 font-display text-[26px] font-bold leading-tight text-primary">
        {es ? "¡Listo! Te contactaremos" : "All set! We'll be in touch"}
      </h3>
      <div className="mx-auto mt-4 inline-flex flex-col gap-1 rounded-xl bg-bg-2 px-5 py-3 text-left text-[13.5px] text-text-2">
        <span>
          <strong className="text-primary">
            {firstName} {lastName}
          </strong>
        </span>
        <span className="capitalize">{appointmentLabel}</span>
        <span>
          {countryName(country, locale)} · {timezoneLabel}
        </span>
      </div>
      <div className="mx-auto mt-5 max-w-md space-y-2 text-[14.5px] leading-relaxed text-text-2">
        <p>
          {es
            ? "En breve uno de nuestros consultores te contactará por WhatsApp para confirmar la información de tu evaluación."
            : "One of our consultants will reach out via WhatsApp shortly to confirm your assessment details."}
        </p>
        <p>
          {es ? (
            <>
              Te contactaremos <strong>1 día antes</strong> de la sesión para confirmar y
              compartirte los puntos a tratar.
            </>
          ) : (
            <>
              We&apos;ll reach out <strong>1 day before</strong> the session to confirm and share
              the talking points.
            </>
          )}
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
  nextDisabled,
  readyToConfirm,
  locale,
}: {
  step: WizardStep;
  submitting: boolean;
  stepError: string | null;
  error: string | null;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  readyToConfirm: boolean;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const nextLabel =
    step === 1
      ? es
        ? "Continuar a fecha"
        : "Continue to date"
      : step === 2
        ? es
          ? "Continuar a hora"
          : "Continue to time"
        : es
          ? "Confirmar evaluación"
          : "Confirm assessment";
  return (
    <div className="flex-none border-t border-line bg-bg-2 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-3 lg:hidden">
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
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13.5px] font-semibold text-text-2 transition-colors hover:border-text-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep disabled:cursor-not-allowed disabled:opacity-0 motion-reduce:transition-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {es ? "Atrás" : "Back"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-[13.5px] font-semibold text-text-2 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:px-3"
          >
            {es ? "Cancelar" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={submitting || nextDisabled}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-amber px-3 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-amber-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:px-5 sm:text-[13.5px]",
              readyToConfirm && "shadow-md ring-2 ring-amber/30 ring-offset-2",
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : step === 3 ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : null}
            {nextLabel}
            {!submitting && step !== 3 ? (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleModalSuccessFooter({
  onClose,
  locale,
}: {
  onClose: () => void;
  locale: "es" | "en";
}) {
  const es = locale === "es";
  return (
    <div className="flex-none border-t border-line bg-bg-2 px-5 py-3 sm:px-7 lg:hidden">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep motion-reduce:transition-none"
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
textarea.qt-input { min-height: 76px; resize: vertical; }
@media (min-width: 1024px) {
  textarea.qt-input { min-height: 64px; }
}
.qt-input[aria-invalid="true"] {
  border-color: var(--c-rose, #E11D48);
  box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.12);
}
@media (prefers-reduced-motion: reduce) {
  .qt-input { transition: none; }
}
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
