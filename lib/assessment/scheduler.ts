export const guidanceThresholds = [
  { seconds: 300, key: "process-selected" },
  { seconds: 600, key: "workflow-impact" },
  { seconds: 780, key: "summary" },
  { seconds: 870, key: "close" },
  { seconds: 900, key: "hard-stop" },
] as const;

export type GuidanceThreshold = (typeof guidanceThresholds)[number]["key"];

export function crossedThresholds(previousSeconds: number, currentSeconds: number) {
  return guidanceThresholds.filter(
    ({ seconds }) => previousSeconds < seconds && currentSeconds >= seconds,
  );
}

export function thresholdInstruction(key: GuidanceThreshold, locale: "es" | "en") {
  const es = locale === "es";
  const copy: Record<GuidanceThreshold, [string, string]> = {
    "process-selected": [
      "Han pasado cinco minutos. Si aún no elegiste un proceso, selecciónalo ahora y continúa en profundidad.",
      "Five minutes have passed. If no process is selected, select one now and go deeper.",
    ],
    "workflow-impact": [
      "Han pasado diez minutos. Termina flujo, volumen e impacto; deja detalles secundarios como pendientes.",
      "Ten minutes have passed. Finish workflow, volume, and impact; leave secondary details pending.",
    ],
    summary: [
      "Inicia el resumen, las correcciones y la confirmación de contacto. No abras una nueva rama.",
      "Start the summary, corrections, and contact confirmation. Do not open a new branch.",
    ],
    close: [
      "Cierra la entrevista ahora con la promesa del reporte en un día laborable.",
      "Close the interview now with the one-business-day report promise.",
    ],
    "hard-stop": ["Finaliza inmediatamente.", "End immediately."],
  };
  return copy[key][es ? 0 : 1];
}
