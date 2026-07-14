# Integración con Easy!Appointments externo

Easy!Appointments 1.6.0 se ejecuta como un servicio independiente en el VPS. Este repositorio no despliega ni administra su contenedor o base de datos.

## Configuración en QuisqueyaTech

Configura exclusivamente como secretos runtime:

```text
EASY_APPOINTMENTS_URL=https://agenda.example.com
EASY_APPOINTMENTS_API_TOKEN=
EASY_APPOINTMENTS_WEBHOOK_TOKEN=
EASY_APPOINTMENTS_PROVIDER_ID=
EASY_APPOINTMENTS_SERVICE_ID=
EASY_APPOINTMENTS_TIMEZONE=America/Santo_Domingo
```

La aplicación consulta `GET /index.php/api/v1/availabilities` y crea citas mediante `POST /index.php/api/v1/appointments`. El navegador nunca recibe la URL ni el token de la instancia.

## Webhook

En Easy!Appointments crea un webhook para los eventos `Save` y `Delete`:

```text
https://quisqueyatech.com/api/webhooks/easy-appointments
```

Configura el encabezado secreto `X-EA-Token` con el mismo valor de `EASY_APPOINTMENTS_WEBHOOK_TOKEN`. Los eventos repetidos son idempotentes y los eventos desconocidos se registran sin modificar reservas.

## Prueba de conexión

1. Consultar disponibilidad desde `/evaluacion/agendar`.
2. Crear una cita de prueba y confirmar su aparición en Easy!Appointments.
3. Confirmar un único correo y un único evento de calendario.
4. Modificar y cancelar desde Easy!Appointments y comprobar que el webhook actualiza Convex.
5. Probar token inválido, horario ocupado y caída temporal; solo una respuesta confirmada puede presentarse como reserva.
