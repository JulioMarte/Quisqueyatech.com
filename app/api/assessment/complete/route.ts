import { NextResponse } from "next/server";
import { assessmentCompleteSchema } from "@/lib/validations/assessment";
import { convexMutation } from "@/lib/server/convex";

export async function POST(request: Request) {
  try {
    const parsed = assessmentCompleteSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid assessment result" },
        { status: 400 },
      );
    const result = buildPreliminaryResult(
      parsed.data.transcript,
      parsed.data.locale,
    );
    await convexMutation("assessments:complete", {
      assessmentId: parsed.data.assessmentId,
      transcript: parsed.data.transcript,
      provider: parsed.data.provider,
      durationSeconds: parsed.data.durationSeconds,
      result,
      completedAt: Date.now(),
    });
    await convexMutation("funnel:track", {
      sessionId: parsed.data.assessmentId,
      locale: parsed.data.locale,
      name: "assessment_completed",
      assessmentId: parsed.data.assessmentId,
      createdAt: Date.now(),
    });
    await sendResultEmail(
      parsed.data.assessmentId,
      parsed.data.email,
      parsed.data.locale,
      result,
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[assessment:complete]", error);
    return NextResponse.json(
      { error: "The assessment could not be completed." },
      { status: 500 },
    );
  }
}

function buildPreliminaryResult(transcript: string, locale: "es" | "en") {
  const text = transcript.toLowerCase();
  const hasFollowUp = /seguimiento|follow.?up|cliente|customer|lead/.test(text);
  const hasReporting = /reporte|report|excel|spreadsheet|métrica|metric/.test(
    text,
  );
  const hasIntake = /formulario|solicitud|intake|request|correo|email/.test(
    text,
  );
  const opportunities = [
    hasFollowUp
      ? {
          title: "Seguimiento con próximo paso visible",
          category: "Automatización",
          impact: "Alto",
          effort: "Medio",
          rationale:
            "Centralizar estados, responsables y recordatorios puede reducir solicitudes olvidadas.",
        }
      : {
          title: "Mapa del proceso prioritario",
          category: "Proceso",
          impact: "Alto",
          effort: "Bajo",
          rationale:
            "Documentar entradas, responsables y puntos de espera evita automatizar un flujo todavía ambiguo.",
        },
    hasReporting
      ? {
          title: "Reporte operativo conectado",
          category: "Software",
          impact: "Medio",
          effort: "Medio",
          rationale:
            "Unificar las fuentes correctas puede reducir preparación manual y mejorar la oportunidad de las decisiones.",
        }
      : {
          title: "Automatización de tareas repetitivas",
          category: "Automatización",
          impact: "Medio",
          effort: "Bajo",
          rationale:
            "Las tareas basadas en reglas son una buena primera oportunidad para demostrar valor con riesgo controlado.",
        },
    hasIntake
      ? {
          title: "Agente para levantamiento y clasificación",
          category: "Agente de IA",
          impact: "Medio",
          effort: "Medio",
          rationale:
            "Un agente puede recopilar contexto consistente y dirigir cada solicitud al flujo apropiado.",
        }
      : {
          title: "Integración entre herramientas",
          category: "Integración",
          impact: "Medio",
          effort: "Medio",
          rationale:
            "Conectar datos aislados evita duplicación y crea una fuente más clara para el equipo.",
        },
  ];
  const result = {
    opportunities,
    nextStep:
      "Validar estas hipótesis con un diagnóstico operativo y seleccionar una primera implementación de alcance cerrado.",
  };
  if (locale === "es") return result;
  const english = [
    hasFollowUp
      ? [
          "Visible follow-up and next steps",
          "Automation",
          "Centralizing status, ownership, and reminders can reduce forgotten requests.",
        ]
      : [
          "Priority process map",
          "Process",
          "Mapping inputs, owners, and waiting points prevents automating a process that is still ambiguous.",
        ],
    hasReporting
      ? [
          "Connected operations reporting",
          "Software",
          "Connecting the right sources can reduce manual reporting and support faster decisions.",
        ]
      : [
          "Repetitive task automation",
          "Automation",
          "Rule-based tasks are a strong first opportunity to prove value with controlled risk.",
        ],
    hasIntake
      ? [
          "Intake and classification agent",
          "AI agent",
          "An agent can collect consistent context and route each request to the appropriate workflow.",
        ]
      : [
          "Tool integration",
          "Integration",
          "Connecting isolated data reduces duplication and creates a clearer source of truth for the team.",
        ],
  ];
  return {
    opportunities: english.map(([title, category, rationale], index) => ({
      title,
      category,
      rationale,
      impact: index === 0 ? "High" : "Medium",
      effort:
        (index === 0 && !hasFollowUp) || (index === 1 && !hasReporting)
          ? "Low"
          : "Medium",
    })),
    nextStep:
      "Validate these hypotheses through an operational diagnosis, then select one tightly scoped first implementation.",
  };
}

async function sendResultEmail(
  assessmentId: string,
  email: string,
  locale: "es" | "en",
  result: ReturnType<typeof buildPreliminaryResult>,
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const admin = process.env.LEAD_TO_EMAIL || "juliomarte@quisqueyatech.com";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "QuisqueyaTech <evaluaciones@quisqueyatech.com>",
      to: email === admin ? [admin] : [email, admin],
      subject:
        locale === "es"
          ? `Tu evaluación preliminar · ${assessmentId}`
          : `Your preliminary assessment · ${assessmentId}`,
      html: `<h1>${locale === "es" ? "Tu evaluación preliminar" : "Your preliminary assessment"}</h1><p>${locale === "es" ? "Estas oportunidades no sustituyen un diagnóstico formal." : "These opportunities do not replace a formal diagnosis."}</p><ul>${result.opportunities.map((item) => `<li><strong>${item.title}</strong>: ${item.rationale}</li>`).join("")}</ul><p><strong>${locale === "es" ? "Próximo paso" : "Next step"}:</strong> ${result.nextStep}</p>`,
    }),
  });
}
