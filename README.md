# 🚗 LiquidApp

**Liquidación inteligente de siniestros automotrices con IA**

LiquidApp es una Progressive Web App (PWA) que digitaliza y automatiza el proceso de liquidación de siniestros vehiculares, utilizando inteligencia artificial para analizar evidencias fotográficas, detectar fraudes, estimar costos de reparación y generar pre-informes técnicos.

---

## ✨ Características Principales

- 📸 **Captura Inteligente de Evidencias** — Guías visuales (ghost overlays) orientan al usuario para fotografiar el vehículo desde los ángulos correctos.
- 🤖 **Análisis con IA** — Cada imagen es procesada por un modelo de visión (GPT-4o / Groq) que identifica partes dañadas, evalúa severidad, estima costos y calcula un score antifraude.
- 📝 **Pre-informes Automáticos** — Generación de informes técnicos en Markdown a partir del análisis consolidado de todas las evidencias.
- ✍️ **Firma Digital** — Captura de firma electrónica del asegurado o ajustador directamente en la app.
- 📄 **Exportación PDF y DOCX** — Descarga de resoluciones y documentos de liquidación en múltiples formatos.
- 📊 **Dashboard Administrativo** — Panel para revisar siniestros, ver análisis de IA, editar informes y gestionar casos.
- 🔔 **PWA Instalable** — Funciona como app nativa en móviles con soporte offline, atajos y notificaciones.
- 🔐 **Autenticación Segura** — Login con Supabase Auth y middleware de protección de rutas.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Lenguaje** | TypeScript |
| **Estilos** | [TailwindCSS 3](https://tailwindcss.com/) |
| **Componentes UI** | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Animaciones** | [Framer Motion](https://www.framer.com/motion/) |
| **Base de Datos** | [Supabase](https://supabase.com/) (PostgreSQL + Storage + Auth) |
| **IA / LLM** | [OpenAI GPT-4o](https://openai.com/) / [Groq](https://groq.com/) |
| **Gráficos** | [Recharts](https://recharts.org/) |
| **Formularios** | React Hook Form + Zod |
| **PDF** | jsPDF + html2canvas |
| **Firma Digital** | react-signature-canvas |
| **PWA** | next-pwa |
| **Deploy** | [Vercel](https://vercel.com/) |

---

## 📂 Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Layout raíz con providers
│   ├── login/                    # Página de autenticación
│   ├── claim/                    # Wizard de reclamo (flujo cliente)
│   ├── campo/                    # Módulo del ajustador de campo
│   │   └── siniestro/[id]/      # Detalle y evidencias por siniestro
│   ├── dashboard/                # Dashboard del cliente/ajustador
│   │   └── siniestro/[id]/      # Vista detallada con informe y firma
│   ├── admin/                    # Panel administrativo
│   │   └── dashboard/           # Inbox de siniestros y detalle
│   └── api/
│       ├── analizar-evidencia/   # Análisis de imagen con IA
│       ├── generar-preinforme/   # Generación de informe técnico
│       ├── queue-analisis/       # Cola de análisis asíncrono
│       └── buscar-cliente/       # Búsqueda de clientes por RUT
├── components/
│   ├── ui/                       # Componentes base (shadcn/ui)
│   ├── landing/                  # Secciones del landing page
│   ├── claim/                    # Pasos del wizard de reclamo
│   ├── dashboard/                # Inbox, ClaimDetail, etc.
│   └── siniestro-detalle/        # Tabs de detalle del siniestro
├── context/
│   └── ClaimContext.tsx          # Estado global del flujo de reclamo
├── hooks/
│   └── useEvidenceUpload.ts     # Hook de subida + análisis de evidencias
├── lib/
│   ├── supabase/                 # Clientes Supabase (server/client)
│   ├── analisis.ts               # Utilidades de análisis
│   └── utils.ts                  # Helpers generales
├── types/
│   └── index.ts                  # Definiciones de tipos TypeScript
└── middleware.ts                 # Protección de rutas con Supabase Auth
```

---

## 🚀 Instalación y Desarrollo

### Prerrequisitos

- **Node.js** >= 18
- **npm** >= 9
- Cuenta en [Supabase](https://supabase.com/)
- API Key de [OpenAI](https://platform.openai.com/) o [Groq](https://console.groq.com/)

### Configuración

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/FelipeCgrillo/liquidapp.git
   cd liquidapp
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**

   ```bash
   cp .env.example .env.local
   ```

   Edita `.env.local` con tus credenciales:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

   # OpenAI o Groq
   OPENAI_API_KEY=sk-tu-api-key

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=LiquidApp
   ```

4. **Iniciar el servidor de desarrollo:**

   ```bash
   npm run dev
   ```

   La app estará disponible en [http://localhost:3000](http://localhost:3000).

### Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de producción |
| `npm run start` | Inicia el servidor de producción |
| `npm run lint` | Ejecuta ESLint |

---

## 🔄 Flujo Principal

```
Usuario / Ajustador
        │
        ▼
┌─────────────────┐
│  Captura Fotos  │ ← Guías visuales por ángulo
│  (Webcam/Upload)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │ ← Storage: imágenes
│  Storage + DB   │ ← DB: registro de evidencia
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API de IA      │ ← GPT-4o / Groq Vision
│  (Análisis)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Resultados     │ ← Severidad, Costos, Score Fraude
│  + Pre-informe  │ ← Informe técnico Markdown
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Dashboard      │ ← Revisión, edición, firma
│  + Exportación  │ ← PDF / DOCX
└─────────────────┘
```

---

## 🔒 Seguridad

- **Autenticación** mediante Supabase Auth con middleware de protección.
- **Row Level Security (RLS)** configurado en las tablas de Supabase.
- **URLs firmadas** con expiración temporal para acceso a evidencias.
- **Variables de entorno** para todas las credenciales sensibles (nunca hardcodeadas).
- Diseñado con estándares de protección de datos personales en mente.

---

## 📱 PWA

LiquidApp es una **Progressive Web App** completamente instalable:

- ✅ Manifest con iconos en múltiples resoluciones
- ✅ Service Worker para cache y offline
- ✅ Atajos rápidos: "Nuevo Siniestro" y "Dashboard"
- ✅ Orientación portrait optimizada para uso en terreno

---

## 📋 Licencia

Proyecto privado. Todos los derechos reservados.

---

## 👥 Equipo

Desarrollado por **Felipe Carrasco Grillo** y equipo.

---

<p align="center">
  <strong>LiquidApp</strong> — Transformando la liquidación de siniestros con inteligencia artificial 🇨🇱
</p>
