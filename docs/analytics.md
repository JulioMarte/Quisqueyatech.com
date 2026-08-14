# Analytics con Umami

QuisqueyaTech usa Umami para pageviews, eventos de producto y conversiones del sitio público.

## Arquitectura

La telemetría tiene cuatro capas:

1. `src/types/analytics.ts` define los eventos permitidos.
2. `src/lib/analytics.ts` convierte metadata tipada en atributos `data-analytics-*`.
3. Los componentes añaden eventos semánticos a acciones importantes.
4. `public/site-analytics.js` usa un listener delegado y llama `window.umami.track()`.

`public/site-analytics.js` también añade cobertura automática para enlaces y botones sin metadata explícita.

El tracker de Umami se carga independientemente desde `/umami-loader.js`. El sistema de motion no controla analytics.

## Eventos semánticos

| Evento | Significado |
|---|---|
| `assessment_start` | El visitante elige iniciar la evaluación por voz. |
| `livekit_open` | El visitante abre la experiencia externa de LiveKit. |
| `assessment_schedule` | El visitante elige el flujo de agenda. |
| `scheduler_open` | El visitante abre el scheduler externo. |
| `solution_click` | El visitante abre una solución. |
| `cta_click` | CTA general que no representa todavía una conversión específica. |
| `nav_click` | Navegación interna. |
| `language_change` | Cambio ES/EN. |
| `resource_click` | Acceso a Recursos. |
| `about_click` | Acceso a información del fundador/empresa. |
| `social_click` | Salida hacia una red social. |
| `email_click` | Uso de enlace `mailto:`. |
| `phone_click` | Uso de enlace `tel:`. |
| `file_download` | Descarga de archivo. |
| `form_submit` | Envío de formulario. |
| `outbound_click` | Salida genérica hacia otro dominio. |
| `privacy_click` | Acceso a Privacidad. |
| `menu_toggle` | Interacción con menús móviles. |
| `ui_click` | Fallback para una acción interactiva sin evento semántico específico. |

## Propiedades de evento

Los eventos pueden incluir:

- `location`: hero, navbar, footer, assessment, final_cta, etc.
- `label`: texto visible o nombre de la acción.
- `destination`: URL de destino.
- `locale`: `es` o `en`.
- `action`: variante funcional de la acción.
- `solution`: solución seleccionada.
- `channel`: LiveKit, scheduler, email, LinkedIn, etc.

No envíes PII en estas propiedades.

## Contexto de sesión

Cuando Umami está disponible, el sitio envía propiedades anónimas de sesión:

```text
locale=es|en
surface=public_web
architecture=astro_static
```

No se asigna un Distinct ID personal.

## Cobertura automática

`site-analytics.js` escucha clicks en:

```text
a
button
summary
[role="button"]
```

Si un componente no tiene `data-analytics-event`, el controlador genera un evento fallback.

También detecta automáticamente:

- enlaces externos;
- `mailto:`;
- `tel:`;
- enlaces con `download`;
- extensiones comunes de descarga;
- submit de formularios.

La cola espera hasta 15 segundos por Umami. Después descarta eventos pendientes para evitar reintentos infinitos cuando el tracker está deshabilitado o bloqueado.

## Goals recomendados en Umami

Crea estos Goals como `Triggered event`:

### Conversión primaria de evaluación por voz

```text
livekit_open
```

Representa el handoff real desde el sitio hacia la evaluación.

### Conversión primaria de agenda

```text
scheduler_open
```

Representa la apertura real del scheduler externo.

### Intención de evaluación

```text
assessment_start
```

### Intención de agenda

```text
assessment_schedule
```

Los Goals de intención ayudan a separar problemas del sitio de problemas en las herramientas externas.

## Funnels recomendados

### Evaluación por voz

Configura un Funnel similar a:

```text
Viewed page: /
Triggered event: assessment_start
Viewed page: /evaluacion/ahora
Triggered event: livekit_open
```

Para inglés:

```text
Viewed page: /en
Triggered event: assessment_start
Viewed page: /en/assessment/now
Triggered event: livekit_open
```

También puedes crear funnels desde páginas de soluciones específicas.

### Agenda

```text
Viewed page: /
Triggered event: assessment_schedule
Viewed page: /evaluacion/agendar
Triggered event: scheduler_open
```

Para inglés usa `/en` y `/en/assessment/schedule`.

## Breakdown recomendado

Analiza los eventos principales por estas propiedades:

```text
location
locale
solution
channel
destination
```

Ejemplos:

- `assessment_start` por `location` muestra qué CTA convierte mejor.
- `solution_click` por `solution` muestra qué oferta genera más interés.
- `language_change` ayuda a medir movimiento entre ES y EN.
- `social_click` por `channel` compara redes sociales.

## Journeys

Usa Journey para estudiar rutas no lineales entre pageviews y eventos.

No fuerces `solution_click` como paso obligatorio en el funnel principal. Un visitante puede convertir directamente desde el hero.

## UTM y atribución

Umami registra los parámetros UTM de campañas. Usa URLs con UTM consistentes para campañas pagadas, email, redes y outreach.

Ejemplo conceptual:

```text
?utm_source=instagram&utm_medium=social&utm_campaign=assessment_launch
```

No conviertas cada campaña en un evento distinto. Usa UTM para adquisición y eventos para comportamiento.

## Conversiones fuera del sitio

El sitio puede confirmar que una persona abrió LiveKit o el scheduler, pero no puede saber por sí solo si terminó la evaluación o reservó una cita.

Para medir conversiones finales necesitas que el sistema externo envíe eventos a Umami, por ejemplo:

```text
assessment_complete
booking_complete
```

Esos eventos deben emitirse desde el servicio que conoce el resultado real, no inferirse desde un click del sitio.

## Prueba manual

En DevTools:

```js
typeof window.umami
```

Debe devolver `"object"` cuando el tracker está disponible.

El controlador público también expone:

```js
QuisqueyaAnalytics.track("ui_click", {
  location: "page",
  label: "diagnostic"
})
```

Usa esta función solo para diagnóstico o interacciones dinámicas que no puedan expresarse en los componentes tipados.
