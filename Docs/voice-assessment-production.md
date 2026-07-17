# Operación del levantamiento conversacional

## Flujo activo

Las evaluaciones nuevas usan exclusivamente `Navegador -> LiveKit Cloud -> agente
quisqueyatech-assessment -> Gemini Live -> Convex`. Ultravox y Gemini directo se
conservan únicamente para leer sesiones históricas; no deben habilitarse como
proveedores de sesiones nuevas.

El modelo predeterminado es `gemini-3.1-flash-live-preview` y la voz predeterminada
es `Aoede`. Gemini 3.1 no admite cambios de instrucciones ni `generateReply`
después de iniciar la sesión, por lo que todo el control conversacional reside en
el prompt inicial y en la respuesta privada de `update_assessment_state`. Para
rollback operativo se puede configurar temporalmente otro modelo Live compatible
en el panel, sin reactivar el cliente Gemini directo.

## Arquitectura y fuentes de verdad

- `AssessmentInterviewEngine` calcula el snapshot; los proveedores nunca calculan cobertura por su cuenta.
- Convex aplica cada evento dentro de una mutación atómica y conserva `assessmentEvents` como historial auditable.
- Una evaluación puede tener varias filas en `assessmentSessions`; reanudar no sobrescribe la sesión anterior.
- Los transcripts del proveedor son evidencia auxiliar. Los reportes se generan solamente desde el snapshot estructurado y requieren aprobación humana.

## Variables obligatorias

Producción falla de forma cerrada si faltan `ASSESSMENT_TOKEN_SECRET`, `ASSESSMENT_STORAGE_SECRET` o las credenciales completas del proveedor elegido. LiveKit también requiere `ASSESSMENT_WORKER_SECRET`. Ultravox requiere `ULTRAVOX_WEBHOOK_SECRET` y Gemini directo requiere un `GEMINI_LIVE_MODEL` explícito.

Use secretos aleatorios distintos, de al menos 32 bytes. No reutilice `ADMIN_API_SECRET`. Configure las mismas variables de worker en Next y en el servicio LiveKit, y nunca use variables `NEXT_PUBLIC_*` para secretos.

El agente debe desplegarse con el nombre exacto `quisqueyatech-assessment`; el JWT
de cada sala lo despacha explícitamente. La API key de Gemini, modelo y voz se
guardan cifrados desde el panel y el worker los obtiene mediante
`/api/assessment/worker-config` autenticado con `ASSESSMENT_WORKER_SECRET`.

## Orden de despliegue

1. Configurar las variables de Convex Cloud descritas en el README y ejecutar `npm run convex:deploy`.
2. Desplegar Next y comprobar `GET /api/health/assessment`.
3. Desplegar el worker LiveKit cuando ese proveedor esté habilitado.
4. Configurar el webhook Ultravox hacia `/api/webhooks/ultravox` y verificar una firma real.
5. Ejecutar un enlace firmado por proveedor antes de cambiar el predeterminado.

## Recuperación de fallos

- Un webhook fallido queda en estado `failed`; el siguiente reintento puede reclamarlo nuevamente. Eventos atascados en `processing` pueden reclamarse tras cinco minutos.
- Una finalización atascada puede reclamarse tras cinco minutos. Los llamados repetidos no generan dos registros de finalización.
- El correo usa una clave de idempotencia por evaluación/revisión. Un fallo deja `reportStatus=send_failed` y debe reintentarse desde el panel.
- Los enlaces de reanudación son bearer tokens de un solo uso, revocables al rotarse y válidos durante 24 horas. No deben copiarse a logs, analítica ni herramientas de soporte.

## Privacidad y retención

- Tarjetas, credenciales y secretos comunes se redactan antes de guardar evidencia, transcript o webhook.
- Audio local expira a 30 días, transcript a 90 y lead/evaluación a 365. El cron elimina también sesiones, eventos y métricas relacionados.
- Active Agent Observability en LiveKit Cloud y configure `record.audio` y
  `record.transcript`. LiveKit Insights es la única copia de audio y tiene una
  retención administrada de 30 días; no configure Egress ni un bucket adicional.
- Convex guarda únicamente el transcript redactado y el `SessionReport`. Nunca
  copie la grabación a Convex.
- La eliminación de grabaciones alojadas por un proveedor debe configurarse además en su política de retención. No habilite grabación productiva en un proveedor sin verificar esa configuración.

## Criterios antes de tráfico real

- Suite contractual y pruebas end-to-end exitosas con credenciales sandbox para los tres proveedores.
- Diez pilotos consentidos, sin datos sensibles reales, distribuidos entre proveedores.
- Cero funciones Convex invocables sin secreto de servicio y cero claves en bundles.
- Cierre verificado antes de 15 minutos, reanudación verificada alrededor del minuto 10 en Gemini y SessionReport recibido desde LiveKit.
- Alertas de latencia, errores, costo y cola de reportes configuradas en la plataforma de observabilidad elegida.
