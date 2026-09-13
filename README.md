
Readme · MD
# AZUI Finance — Banorte × Tec de Monterrey (HackMTY 2026)
 
Un asistente financiero que, en lugar de solo contestar con texto, **arma la pantalla que resuelve lo que el usuario pidió**. El modelo (Gemini) interpreta la intención, un capa de herramientas consulta los datos reales en Supabase, y el frontend renderiza componentes interactivos (gráficas, tarjetas, chips) en vez de un chat de puro texto.
 
Esto es el reto de Banorte: **LLM al centro, MCP para datos/acciones, A2UI para la interfaz.**
 
---
 
## La idea en una frase
 
El usuario dice "quiero bajar mis intereses" (o le da clic a un botón), el backend decide *qué pantalla* le sirve para eso, y el frontend la dibuja. Si el usuario interactúa con esa pantalla (por ejemplo, elige un plazo de pago), esa interacción regresa al backend como una nueva petición y el ciclo se repite.
 
```
Usuario (texto o clic)
      ↓
Backend interpreta la intención (Gemini)
      ↓
Backend consulta datos reales (Supabase, vía las "herramientas")
      ↓
Backend arma la respuesta: texto + qué componente mostrar + con qué datos
      ↓
Frontend busca ese componente en su catálogo y lo dibuja
      ↓
Usuario interactúa con el componente → vuelve al paso 1
```
 
---
 
## Estructura del repo
 
```
server_cmp/          ← Backend (FastAPI + Gemini + Supabase)
  main.py            ← Toda la lógica: interpretar, consultar, generar UI
  core/
    contract.py       ← Helpers para envolver resultados como éxito/error
    db.py             ← Conexión a Supabase
  tools/              ← Cada archivo = una consulta financiera distinta
    comparar_meses.py
    resumen_categoria.py
    analizar_inversion.py
 
frontend-a2ui/        ← Frontend (React + Vite + Tailwind)
  src/
    App.tsx            ← Pantalla principal, guarda el historial de turnos
    a2ui/
      contract.ts       ← Define, con Zod, cómo se ve un mensaje válido
      registry.tsx       ← Catálogo: nombre de componente → componente real
      Renderer.tsx        ← Recorre los bloques de un mensaje y los dibuja
      adaptLegacy.ts       ← Traduce la respuesta del backend al formato que usa el Renderer
    lib/realBackend.ts    ← Las tres llamadas que puede hacer el frontend: mensaje, evento, apertura de app
    A2UIComponents.tsx     ← Las piezas visuales (gráfica, tarjeta, simulador)
```
 
---
 
## El backend, paso a paso
 
**1. Interpretar (`interpretar()`)**
Le manda el texto del usuario a Gemini junto con un `system_instruction` que le dice: "clasifica esto en una de estas intenciones: comparar_meses, ver_resumen, crear_plan_inversion, ver_historial, o no_reconocida, y sácame las fechas en formato YYYY-MM". Gemini responde en JSON estricto (`ContratoA`), forzado por `response_schema`.
 
**2. Consultar (`consultar_patricio()`)**
Con esa intención ya clasificada, decide qué herramienta llamar:
- `comparar_meses` → compara dos periodos puntuales
- `resumen_categoria` → gasto y saldo de un solo mes
- `analizar_inversion` → arma una recomendación de inversión
- `ver_historial` → trae la serie completa de varios meses/años (la que agregamos para las consultas tipo "últimos 4 años")
Cada herramienta habla directo con Supabase y regresa números crudos.
 
**3. Generar UI (`generar_ui()`)**
Toma esos números y decide dos cosas: qué texto amigable mostrar, y qué **componente** usar para representarlo (`grafica_comparativa`, `tarjeta_resumen`, `simulador_inversion`, `historial_chart`, o `ninguno` si no hay nada que mostrar). Esto es el "Contrato C" — la respuesta final que recibe el frontend.
 
**Endpoints expuestos:**
| Ruta | Para qué |
|---|---|
| `POST /mensaje` | El usuario escribió texto libre |
| `POST /agent/turn` | Se abrió la app (pantalla inicial, sin que el usuario haga nada) |
| `POST /interact` | El usuario le dio clic a algo (un chip, un botón dentro de una tarjeta) |
| `GET /health` | Ver si el servidor sigue vivo |
 
---
 
## El frontend, paso a paso
 
**1. El contrato (`contract.ts`)**
Define con Zod la forma exacta de un mensaje válido: tiene `blocks` (una lista, aunque sea de uno), y cada bloque dice su `component` y sus `props`. Esto es lo que hace que agregar un componente nuevo sea seguro — si el backend manda algo mal formado, se nota aquí antes de intentar dibujarlo.
 
**2. El adaptador (`adaptLegacy.ts`)**
El backend todavía responde en su formato original (`texto_respuesta` / `componente` / `props`), no en el formato de bloques. Esta pieza traduce uno al otro, y además le agrega los chips de "qué más puedes hacer" (`clarify_chips`) a casi todas las respuestas, para que el usuario siempre tenga un siguiente paso visible.
 
**3. El registro (`registry.tsx`)**
Es el catálogo: `"clarify_chips"` → el componente `ClarifyChips`, `"spend_comparison_chart"` → `SpendComparisonChart`, etc. Si el backend manda un nombre de componente que no está aquí, cae en `text_block` (solo texto) en vez de romperse.
 
**4. El renderer (`Renderer.tsx`)**
Recorre los bloques del mensaje actual y, por cada uno, busca su componente en el registro y lo dibuja con sus props reales — pasa el bloque tal cual, sin reescribirlo, para que cada componente reciba exactamente los datos que necesita.
 
**5. La pantalla (`App.tsx`)**
Guarda un arreglo `feed` con todos los mensajes que han llegado (como un feed, no como un chat de burbujas). Al abrir la app, dispara automáticamente `sendAppOpened()` para que la pantalla ya tenga algo que mostrar antes de que el usuario escriba nada. Cuando el usuario da clic en un chip o botón, se llama `sendEvent()`; cuando escribe texto, se llama `sendText()` — ambos regresan un mensaje nuevo que se agrega al feed.
 
---
 
## Cómo correrlo en local
 ## OPCION 1 
 Script de ejecucion rapida 

 
```bash
.\start-dev.ps1
```
 

## OPCION 2, individualmente 
**Backend**
```bash
cd server_cmp
pip install -r requirements.txt
# Crear .env con: SUPABASE_URL, SUPABASE_KEY, API_KEY (Gemini)
uvicorn http_server:app --reload --port 8000
```
 
**Frontend**
```bash
cd frontend-a2ui
npm install
# .env ya trae:
# VITE_API_BASE_URL=http://localhost:8000
# VITE_USE_MOCK=false
# VITE_USER_ID=1
npm run dev
```
 
---
 
