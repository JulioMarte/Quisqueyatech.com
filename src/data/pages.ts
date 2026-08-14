export type Locale = "es" | "en";
export type Point = readonly [string, string];
export type StaticPage = {
  path: string;
  locale: Locale;
  eyebrow: string;
  title: string;
  lede: string;
  points?: readonly Point[];
  kind?: "standard" | "assessment" | "livekit" | "resources" | "about" | "privacy";
};

const es = (path:string, eyebrow:string, title:string, lede:string, points:readonly Point[]=[], kind:StaticPage["kind"]="standard"):StaticPage => ({path,locale:"es",eyebrow,title,lede,points,kind});
const en = (path:string, eyebrow:string, title:string, lede:string, points:readonly Point[]=[], kind:StaticPage["kind"]="standard"):StaticPage => ({path,locale:"en",eyebrow,title,lede,points,kind});

export const pages: StaticPage[] = [
  es("soluciones","Soluciones","Mejoramos la operación antes de añadir tecnología.","Cada solución comienza con un proceso, un responsable y un resultado que pueda comprobarse.",[["Automatización de procesos","Reduce tareas repetidas, demoras y traspasos manuales."],["Agentes de IA","Recopila información y ejecuta tareas dentro de límites definidos."],["Software e integraciones","Une herramientas, datos y flujos que hoy operan por separado."]]),
  es("soluciones/automatizacion","Automatización de procesos","Haz que el trabajo avance sin depender de recordatorios constantes.","Diseñamos flujos que mueven información, asignan tareas y mantienen al equipo al tanto sin añadir otra capa de desorden.",[["Entrada y clasificación","Convierte formularios, correos y solicitudes en trabajo asignado."],["Seguimiento","Activa recordatorios y próximos pasos basados en estado y tiempo."],["Reportes","Actualiza métricas y resúmenes desde las fuentes correctas."]]),
  es("soluciones/agentes-de-ia","Agentes de IA","IA que conversa, recopila y actúa con límites claros.","Construimos agentes de voz y texto alrededor de un proceso verificable, con herramientas autorizadas y escalamiento a personas.",[["Levantamiento","Recopila contexto de clientes o equipos de forma consistente."],["Atención","Responde solicitudes frecuentes y deriva excepciones."],["Operaciones","Consulta sistemas y ejecuta acciones permitidas con trazabilidad."]]),
  es("soluciones/software-e-integraciones","Software e integraciones","Conecta lo que ya funciona. Construye solo lo que hace falta.","Integramos herramientas existentes y desarrollamos interfaces específicas cuando una solución genérica no encaja.",[["Integraciones","Sincroniza CRM, agenda, formularios, correo y sistemas internos."],["Aplicaciones internas","Crea flujos simples para tareas que hoy viven en hojas y mensajes."],["Datos operativos","Mantén una fuente clara y accesible para decisiones y seguimiento."]]),
  es("soluciones/clinicas","Aplicación para clínicas","Menos carga administrativa alrededor de cada paciente.","Evaluamos la operación particular de cada clínica antes de recomendar cambios.",[["Recepción","Organiza solicitudes, datos iniciales y responsables."],["Agenda","Conecta disponibilidad, confirmaciones y cambios."],["Seguimiento","Mantiene próximos pasos después de la consulta."]]),
  es("como-trabajamos","Cómo trabajamos","Una ruta clara desde el problema hasta un sistema en uso.","Primero entendemos cómo fluye el trabajo y qué resultado justificaría cambiarlo.",[["1. Evaluación","Identificamos proceso, fricción e impacto."],["2. Diagnóstico","Mapeamos prioridades, riesgos y una propuesta por fases."],["3. Implementación","Construimos, integramos, probamos y capacitamos."],["4. Mejora","Medimos uso real y corregimos lo necesario."]]),
  es("evaluacion","Evaluación inicial","Elige cómo quieres comenzar.","La evaluación es una conversación estructurada de 12–15 minutos. LiveKit gestionará la sala y el enlace de invitación.",[],"assessment"),
  es("evaluacion/ahora","Evaluación por voz","Inicia tu evaluación desde una sala segura.","Esta página ya no ejecuta lógica de agente. El botón se conecta a un enlace de invitación de LiveKit configurado durante el build.",[],"livekit"),
  es("evaluacion/agendar","Agendar evaluación","Reserva un horario para conversar.","La experiencia pública permanece estática. La invitación de llamada se entrega mediante LiveKit o el sistema externo de agenda.",[],"livekit"),
  es("recursos","Recursos","Recursos para tomar mejores decisiones tecnológicas.","Guías prácticas sobre automatización, agentes de IA e integración de sistemas.",[],"resources"),
  es("nosotros","Nosotros","Una firma tecnológica con atención de fundador.","QuisqueyaTech trabaja desde República Dominicana con empresas dentro y fuera del país.",[],"about"),
  es("privacidad","Privacidad","Tu privacidad importa.","Esta política explica cómo tratamos la información que compartes con QuisqueyaTech.",[],"privacy"),

  en("en","Automation, AI, and software for modern companies","Your business does not need more tools. It needs the right ones working together.","We examine how your team operates, find where time is lost, and design technology that improves productivity without adding operational complexity."),
  en("en/solutions","Solutions","We improve operations before adding technology.","Every solution starts with a process, an owner, and an outcome that can be verified.",[["Process automation","Reduce repetitive tasks, delays, and manual handoffs."],["AI agents","Collect information and perform tasks within clear boundaries."],["Software and integrations","Connect tools, data, and workflows that currently operate separately."]]),
  en("en/solutions/automation","Process automation","Keep work moving without constant reminders.","We design workflows that move information, assign tasks, and keep teams informed without adding another layer of complexity.",[["Intake and routing","Turn forms, email, and requests into assigned work."],["Follow-up","Trigger reminders and next steps based on status and time."],["Reporting","Update metrics and summaries from the correct sources."]]),
  en("en/solutions/ai-agents","AI agents","AI that can converse, collect, and act within clear boundaries.","We build voice and text agents around verifiable workflows, approved tools, and human escalation.",[["Discovery","Collect customer or team context consistently."],["Service","Handle common requests and escalate exceptions."],["Operations","Query systems and perform approved actions with traceability."]]),
  en("en/solutions/software-and-integrations","Software and integrations","Connect what already works. Build only what is missing.","We integrate existing tools and create focused interfaces when generic software does not fit the workflow.",[["Integrations","Sync CRM, scheduling, forms, email, and internal systems."],["Internal applications","Create simple workflows for tasks currently managed in spreadsheets and messages."],["Operational data","Maintain a clear source for decisions and follow-up."]]),
  en("en/solutions/clinics","Application for clinics","Less administrative work around every patient.","We assess each clinic before recommending changes.",[["Intake","Organize requests, initial information, and ownership."],["Scheduling","Connect availability, confirmations, and changes."],["Follow-up","Maintain next steps after a visit."]]),
  en("en/how-we-work","How we work","A clear path from the problem to a system people use.","We first understand how work moves and which outcome would justify changing it.",[["1. Assessment","Identify workflow, friction, and impact."],["2. Diagnosis","Map priorities, risks, and a phased proposal."],["3. Implementation","Build, integrate, test, and train."],["4. Improvement","Measure real usage and improve the system."]]),
  en("en/assessment","Initial assessment","Choose how you want to begin.","The assessment is a structured 12–15 minute conversation. LiveKit provides the room and invitation link.",[],"assessment"),
  en("en/assessment/now","Voice assessment","Start your assessment in a secure room.","This page contains no agent backend. Its call-to-action uses a LiveKit invitation URL configured at build time.",[],"livekit"),
  en("en/assessment/schedule","Schedule assessment","Reserve a time to talk.","The public website remains static. LiveKit or an external scheduler delivers the call invitation.",[],"livekit"),
  en("en/recursos","Resources","Resources for better technology decisions.","Practical guidance on automation, AI agents, and systems integration.",[],"resources"),
  en("en/about","About","A technology firm with founder-level attention.","QuisqueyaTech works from the Dominican Republic with companies at home and abroad.",[],"about"),
  en("en/privacy","Privacy","Your privacy matters.","This policy explains how QuisqueyaTech handles information you share with us.",[],"privacy")
];

export const solutionLinks = {
  es: [["/soluciones/automatizacion","Automatización"],["/soluciones/agentes-de-ia","Agentes de IA"],["/soluciones/software-e-integraciones","Software e integraciones"],["/soluciones/clinicas","Clínicas"]],
  en: [["/en/solutions/automation","Automation"],["/en/solutions/ai-agents","AI agents"],["/en/solutions/software-and-integrations","Software & integrations"],["/en/solutions/clinics","Clinics"]]
} as const;
