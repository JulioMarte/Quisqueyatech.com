import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre").max(80),
  business: z.string().min(2, "Ingresa el nombre del negocio").max(100),
  sector: z.enum([
    "clinicas",
    "academias",
    "comercios",
    "servicios",
    "otro",
  ]),
  whatsapp: z
    .string()
    .min(8, "Ingresa un WhatsApp válido")
    .max(20)
    .regex(/^[+\d\s()-]+$/, "Solo números y +"),
  pain: z.enum([
    "whatsapp-perdido",
    "citas",
    "seguimiento",
    "reportes",
    "tareas-manuales",
    "otro",
  ]),
  message: z.string().max(500).optional().or(z.literal("")),
  source: z.string().max(40).optional(),
  website: z.string().max(0).optional(), // honeypot
});

export type LeadInput = z.infer<typeof leadSchema>;

export const sectorLabels: Record<LeadInput["sector"], string> = {
  clinicas: "Clínicas / Odontología",
  academias: "Academias / Educación",
  comercios: "Ferreterías / Comercios",
  servicios: "Servicios profesionales",
  otro: "Otro",
};

export const painLabels: Record<LeadInput["pain"], string> = {
  "whatsapp-perdido": "Clientes que se pierden en WhatsApp",
  citas: "Citas mal gestionadas / pacientes que no llegan",
  seguimiento: "Clientes sin seguimiento",
  reportes: "Sin números claros del negocio",
  "tareas-manuales": "Tareas repetitivas manuales",
  otro: "Otro",
};
