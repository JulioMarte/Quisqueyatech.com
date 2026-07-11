import {
  CalendarCheck,
  Clock3,
  MessageCircle,
  Phone,
  Camera,
  FileText,
  Users,
  BarChart3,
  CheckSquare,
} from "lucide-react";

export function SystemPanel() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-line bg-white p-5 shadow-[0_30px_60px_-20px_rgba(8,47,73,0.15)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber via-larimar to-tech" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          Sistema QuisqueyaTech
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          Operación en vivo
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-line bg-bg-2 p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
              Bandeja WhatsApp
            </span>
            <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[11px] font-semibold text-rose">
              3 nuevos
            </span>
          </div>
          <div className="space-y-2">
            {[
              { name: "María R.", msg: "¿Tienen cupo mañana?", tag: "Nuevo" },
              { name: "Clínica Norte", msg: "Confirmar cita 3:00 PM", tag: "Cita" },
              { name: "Luis P.", msg: "Precio de limpieza", tag: "Pregunta" },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-line bg-white p-2.5"
              >
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-[#DCFCE7] text-emerald-700">
                  <MessageCircle className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-text">
                      {item.name}
                    </p>
                    <span className="font-mono text-[10px] uppercase text-mute">
                      {item.tag}
                    </span>
                  </div>
                  <p className="truncate text-[12.5px] text-text-2">{item.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[var(--radius-md)] border border-line bg-bg-2 p-3.5">
            <span className="mb-2 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
              Seguimiento
            </span>
            <div className="space-y-2">
              {[
                { stage: "Nuevo", n: 12, color: "bg-larimar" },
                { stage: "Contactado", n: 8, color: "bg-tech" },
                { stage: "Agendado", n: 5, color: "bg-amber" },
                { stage: "Cerrado", n: 3, color: "bg-success" },
              ].map((s) => (
                <div key={s.stage} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  <span className="flex-1 text-[13px] text-text-2">{s.stage}</span>
                  <span className="text-[13px] font-semibold text-text">{s.n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-line bg-primary p-3.5 text-white">
            <div className="mb-2 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-larimar" />
              <span className="text-[13px] font-semibold">Cita confirmada</span>
            </div>
            <p className="text-[13px] text-white/85">Ana G. · Odontología · 10:30 AM</p>
            <p className="mt-1 font-mono text-[11px] text-larimar">
              Llegó por Instagram · Recordatorio 24h enviado
            </p>
            <p className="mt-2 text-[12px] text-white/70">
              Próxima acción: llamar mañana 9:00 AM
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[var(--radius-md)] border border-line bg-white p-3">
              <div className="mb-1 flex items-center gap-1.5 text-mute">
                <Clock3 className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] uppercase">Respuesta</span>
              </div>
              <p className="font-display text-xl font-bold text-primary">4 min</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-white p-3">
              <div className="mb-1 flex items-center gap-1.5 text-mute">
                <Users className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] uppercase">Nuevos hoy</span>
              </div>
              <p className="font-display text-xl font-bold text-primary">18</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> WA
          </span>
          <span className="inline-flex items-center gap-1">
            <Camera className="h-3 w-3" /> IG
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" /> Llamadas
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" /> Formularios
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-success">
          <BarChart3 className="h-3 w-3" />
          <CheckSquare className="h-3 w-3" />
          Control operativo
        </span>
      </div>
    </div>
  );
}
