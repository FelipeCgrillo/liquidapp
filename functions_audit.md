# Auditoría de Funciones del Proyecto LiquidApp

Fecha: 18 de Febrero de 2026
Alcance: `src/hooks`, `src/context`, `src/app/api`, `src/app/admin`, `src/app/campo`, `src/components`

## 1. Core Logic & Hooks

### `src/hooks/useEvidenceUpload.ts`

#### `useEvidenceUpload`
- **Ubicación:** `src/hooks/useEvidenceUpload.ts` (L17)
- **Tipo:** Custom Hook
- **Retorno:** `{ uploadAndAnalyze: Function, isUploading: boolean }`
- **Descripción:** Hook centralizado para la subida y análisis de evidencias. Maneja la carga a Supabase Storage, insert en BD y llamada a la API de IA.

#### `uploadAndAnalyze`
- **Ubicación:** Dentro de `useEvidenceUpload` (L20)
- **Parámetros:**
  - `file: File`: El archivo de imagen.
  - `options: UploadOptions`: Objeto con `siniestroId`, `description`, `location`, `order`.
- **Retorno:** `Promise<EvidenciaConAnalisis>`
- **Lógica Interna:**
  1. Activa estado `isUploading`.
  2. Sube imagen a bucket `evidencias-siniestros` con timestamp.
  3. Inserta registro en tabla `evidencias` con metadatos.
  4. Genera URL firmada (1h) para la imagen subida.
  5. Llama a `/api/analizar-evidencia` con la URL firmada.
  6. Devuelve objeto combinado con resultado de IA.
- **Contexto:** Usado en `ClaimContext` (Wizard) y `EvidenciasPage` (Campo) para estandarizar el flujo de captura + análisis.

---

### `src/context/ClaimContext.tsx`

#### `ClaimProvider`
- **Ubicación:** `src/context/ClaimContext.tsx` (L25)
- **Tipo:** Context Provider Component
- **Descripción:** Gestiona el estado global del proceso de reclamo (wizard/flujo cliente). Mantiene `siniestroId`, lista de `evidencias` y `pasoActual`.

#### `crearSiniestro` (interno)
- **Ubicación:** Dentro de `ClaimProvider` (L32)
- **Retorno:** `Promise<string | null>` (ID del siniestro)
- **Lógica:** Crea un siniestro en estado `borrador` con valores por defecto si no existe uno en el contexto.

#### `agregarEvidencia` (exposed)
- **Ubicación:** Dentro de `ClaimProvider` (L71)
- **Parámetros:** `file: File`, `tipo: string`
- **Lógica:**
  1. Asegura que exista `siniestroId`.
  2. Actualiza UI optimísticamente con evidencia temporal (`analizando: true`).
  3. Llama a `uploadAndAnalyze`.
  4. Actualiza el estado con el resultado real de la IA o revierte si hay error.

#### `finalizarSiniestro` (exposed)
- **Ubicación:** Dentro de `ClaimProvider` (L128)
- **Lógica:** Actualiza estado del siniestro a `en_revision` y timestamp `enviado_revision_at`.

---

## 2. API Routes (Backend)

### `src/app/api/analizar-evidencia/route.ts`

#### `POST`
- **Ubicación:** `src/app/api/analizar-evidencia/route.ts` (L50)
- **Parámetros:** `Request` (JSON: `evidencia_id`, `imagen_url`, `siniestro_id`)
- **Retorno:** `NextResponse` (JSON con análisis IA)
- **Lógica:**
  1. Valida input.
  2. Llama a **OpenAI GPT-4o** con prompt de sistema para peritaje (Antifraude, Triage, Costos).
  3. Parsea respuesta JSON.
  4. Guarda resultado en tabla `analisis_ia`.
  5. Actualiza tabla `evidencias` (`analizado: true`).
  6. Llama a `actualizarResumenSiniestro`.

#### `actualizarResumenSiniestro`
- **Ubicación:** `src/app/api/analizar-evidencia/route.ts` (L179)
- **Parámetros:** `supabase`, `siniestroId`
- **Lógica:** Recalcula métricas del siniestro basándose en todos los análisis asociados:
  - Severidad máxima encontrada.
  - Score fraude máximo encontrado.
  - Suma de costos estimados (min/max).
  - Actualiza tabla `siniestros`.

### `src/app/api/generar-preinforme/route.ts`

#### `POST`
- **Ubicación:** `src/app/api/generar-preinforme/route.ts` (L7)
- **Lógica:**
  1. Obtiene siniestro completo con todas las evidencias y análisis.
  2. Construye prompt detallado con el resumen de cada evidencia y metadatos.
  3. Solicita a **GPT-4o** generar un informe técnico en Markdown.
  4. Guarda/Actualiza en tabla `pre_informes` (versiones).

---

## 3. Admin Dashboard

### `src/app/admin/dashboard/page.tsx`

#### `AdminDashboardPage`
- **Ubicación:** `src/app/admin/dashboard/page.tsx` (L11)
- **Tipo:** Client Component (Page)
- **Estado:** `claims` (lista), `selectedId` (ID activo), `selectedClaim` (detalle completo).
- **Lógica:**
  1. `useEffect` (L19): Carga lista inicial de 50 siniestros recientes.
  2. `useEffect` (L44): Cuando cambia `selectedId`, carga detalles completos.
  3. **Generación de URLs:** Al cargar detalle, genera URLs firmadas (1h) para todas las evidencias asociadas y las inyecta en el objeto `selectedClaim`.

---

### `src/components/dashboard/Inbox.tsx`

#### `Inbox`
- **Ubicación:** `src/components/dashboard/Inbox.tsx` (L20)
- **Props:** `claims`, `selectedId`, `onSelect`, `loading`.
- **Lógica Visual:**
  - Muestra lista scrollable de siniestros.
  - **Cálculo de Riesgo (L47):** Usa `score_fraude_general` para determinar color de la barra lateral (Verde < 0.3, Amarillo < 0.6, Rojo > 0.6).
  - Formatea fechas con `date-fns` (hace X tiempo).

### `src/components/dashboard/ClaimDetail.tsx`

#### `ClaimDetail`
- **Ubicación:** `src/components/dashboard/ClaimDetail.tsx` (L16)
- **Props:** `siniestro: SiniestroCompleto`.
- **Lógica:**
  - Renderiza metadatos (fecha, dirección, asegurado).
  - **Galería Inteligente (L63):** Mapea `siniestro.evidencias`.
  - Muestra "AI Annotations" (partes dañadas) como etiquetas sobre la imagen.
  - Muestra alerta si `score_fraude_general` > 0.6.

---

## 4. Field Agent & Client

### `src/app/campo/siniestro/[id]/evidencias/page.tsx`

#### `EvidenciasPage`
- **Ubicación:** `src/app/campo/siniestro/[id]/evidencias/page.tsx` (L35)
- **Lógica:**
  - Maneja la captura de fotos por parte del ajustador/usuario.
  - Usa `useEvidenceUpload` para procesar cada foto.
  - Muestra resultados de análisis en tiempo real (loader -> resultado).
  - Permite enviar a revisión (genera pre-informe automáticamente).

### `src/components/claim/StepEvidence.tsx`

#### `StepEvidence`
- **Ubicación:** `src/components/claim/StepEvidence.tsx` (L35)
- **Descripción:** Paso del Wizard para usuarios finales.
- **Features:**
  - Integración con `react-webcam`.
  - Guías visuales (ghost overlays) para orientar la foto (Frente, Lado, etc.).
  - Fallback a input de archivo si falla la cámara.

### `src/app/dashboard/siniestro/[id]/page.tsx`

#### `SiniestroDetallePage`
- **Ubicación:** `src/app/dashboard/siniestro/[id]/page.tsx` (L29)
- **Descripción:** Dashboard del Cliente/Ajustador para revisar el caso.
- **Funcionalidades:**
  - Ver análisis de evidencias.
  - **Edición de Informe:** Permite editar el Markdown del pre-informe generado.
  - **Firma Digital:** Usa `react-signature-canvas` para capturar firma.
  - **Exportar PDF:** Renderiza el informe a canvas y genera PDF cliente-side.

---

## Recomendaciones y Observaciones

1.  **Manejo de URLs:**
    - Actualmente las URLs firmadas se generan en `AdminDashboardPage` y en `useEvidenceUpload` de forma separada. Considerar un hook `useSignedUrl` o resolverlas sistemáticamente en el backend/API para consistencia.

2.  **Complejidad en `SiniestroDetallePage`:**
    - Este componente es muy grande (>600 líneas). Recomendable refactorizar las pestañas (Evidencias, Informe, Firma) en sub-componentes: `ClientEvidenceTab`, `ReportEditorTab`, `SignatureTab`.

3.  **Tipado:**
    - Se detectó uso de `as unknown as SiniestroCompleto` en algunas partes para forzar tipos complejos (joins de Supabase). Revisar definiciones en `types/index.ts` para alinear con la respuesta real de las queries anidadas.

4.  **Optimización:**
    - `useEvidenceUpload` solicita análisis inmediato. Para lotes grandes de fotos, podría ser mejor encolar el análisis (background job) para no bloquear la UI del cliente, aunque para el caso de uso actual (pocas fotos) funciona bien.
