# ==============================================================================
# [TAG 1: IMPORTACIONES Y LIBRERÍAS]
# ==============================================================================
import json
import os
import re
import time
import warnings
from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from google.genai.errors import ServerError
from dotenv import load_dotenv

from core.db import get_supabase_client
from tools import ejecutar_herramienta

load_dotenv()
warnings.filterwarnings("ignore")

app = FastAPI(title="AZUI Finance Server", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# [TAG 2: AUTENTICACIÓN ESTRICTA Y BLINDADA]
# ==============================================================================
def autenticar_usuario(matricula: str, nombre: str) -> Optional[str]:
    try:
        client = get_supabase_client()
        response = client.table("usuarios").select("id, nombre").execute()
        filas = response.data or []

        input_matricula = matricula.strip()
        input_nombre = nombre.strip().lower()

        for fila in filas:
            db_id = str(fila.get("id"))
            db_nombre = str(fila.get("nombre", "")).strip().lower()

            if db_id == input_matricula and input_nombre == db_nombre:
                return db_id

    except Exception as e:
        print(f" Error al consultar la tabla 'usuarios' en Supabase: {e}")
        return None

    return None

# ==============================================================================
# [TAG 3: DEFINICIÓN DEL CONTRATO A - PYDANTIC]
# ==============================================================================
class ParametrosIA(BaseModel):
    mes_inicio: Optional[str] = Field(default=None, description="Mes inicial (YYYY-MM).")
    mes_fin: Optional[str] = Field(default=None, description="Mes final (YYYY-MM).")
    anios: Optional[int] = Field(default=None, description="Cantidad de años del historial solicitado.")
    monto_inversion: Optional[float] = Field(default=None, description="Monto explícito si el usuario lo menciona.")

class ContratoA(BaseModel):
    intencion: Literal["comparar_meses", "ver_resumen", "ver_historial", "crear_plan_inversion", "no_reconocida"]
    usuario_id: str
    parametros: ParametrosIA
    confianza: Literal["alta", "media", "baja"]
    nota_usuario: Optional[str] = Field(default=None)

# ==============================================================================
# [TAG 4: DEFINICIÓN DEL CONTRATO C - PYDANTIC]
# ==============================================================================
class PropsUI(BaseModel):
    titulo: Optional[str] = Field(default=None)
    etiqueta_periodo_a: Optional[str] = Field(default=None)
    valor_periodo_a: Optional[float] = Field(default=None)
    etiqueta_periodo_b: Optional[str] = Field(default=None)
    valor_periodo_b: Optional[float] = Field(default=None)
    porcentaje_cambio: Optional[float] = Field(default=None)
    saldo_actual: Optional[float] = Field(default=None)
    limite_mensual_tarjeta: Optional[float] = Field(default=None)
    gasto_mes_actual: Optional[float] = Field(default=None)
    porcentaje_usado: Optional[float] = Field(default=None)
    
    monto_sugerido_inversion: Optional[float] = Field(default=None, description="Monto base recomendado para invertir.")
    sitio_recomendado_1: Optional[str] = Field(default=None, description="Mejor plataforma o instrumento seguro.")
    rendimiento_sitio_1: Optional[str] = Field(default=None, description="Tasa o rendimiento estimado 1.")
    sitio_recomendado_2: Optional[str] = Field(default=None, description="Mejor plataforma o instrumento de mayor rendimiento.")
    rendimiento_sitio_2: Optional[str] = Field(default=None, description="Tasa o rendimiento estimado 2.")
    ganancia_anual_sitio_1: Optional[float] = Field(default=None)
    ganancia_anual_sitio_2: Optional[float] = Field(default=None)

class ContratoC(BaseModel):
    texto_respuesta: str = Field(description="Mensaje amigable explicando la recomendación.")
    componente: Literal["grafica_comparativa", "historial_chart", "tarjeta_resumen", "tabla_categorias", "simulador_inversion", "ninguno"]
    props: PropsUI

class MensajeRequest(BaseModel):
    texto: str
    usuario_id: str

class AccionUIRequest(BaseModel):
    tipo: str = Field(default="accion_ui")
    accion: str
    usuario_id: str
    contexto: dict = Field(default_factory=dict)

class AgentTurnRequest(BaseModel):
    usuario_id: str
    event: dict = Field(default_factory=dict)


MESES_ES = {
    "enero": 1,
    "ene": 1,
    "febrero": 2,
    "feb": 2,
    "marzo": 3,
    "mar": 3,
    "abril": 4,
    "abr": 4,
    "mayo": 5,
    "may": 5,
    "junio": 6,
    "jun": 6,
    "julio": 7,
    "jul": 7,
    "agosto": 8,
    "ago": 8,
    "septiembre": 9,
    "setiembre": 9,
    "sep": 9,
    "set": 9,
    "octubre": 10,
    "oct": 10,
    "noviembre": 11,
    "nov": 11,
    "diciembre": 12,
    "dic": 12,
}


def normalizar_mes(valor: object, referencia: Optional[datetime] = None) -> Optional[str]:
    """Convert a month label into the YYYY-MM format required by Supabase tools."""
    if not isinstance(valor, str):
        return None

    texto = valor.strip().lower()
    if not texto:
        return None

    if re.fullmatch(r"\d{4}-\d{2}", texto):
        try:
            datetime.strptime(texto, "%Y-%m")
        except ValueError:
            return None
        return texto

    coincidencia = re.fullmatch(
        r"([a-záéíóúñ]+)(?:\s+de)?(?:\s+(\d{4}))?", texto
    )
    if not coincidencia:
        return None

    mes = MESES_ES.get(coincidencia.group(1))
    if mes is None:
        return None

    ahora = referencia or datetime.now()
    anio = int(coincidencia.group(2)) if coincidencia.group(2) else ahora.year
    if coincidencia.group(2) is None and mes > ahora.month:
        anio -= 1

    return f"{anio:04d}-{mes:02d}"

# ==============================================================================
# [TAG 5: CONEXIÓN CON LA API DE GEMINI Y WRAPPER DE REINTENTO]
# ==============================================================================
API_KEY = os.getenv("API_KEY")
client = genai.Client(api_key=API_KEY)

def llamada_segura_gemini(modelo: str, contents, config):
    """Función protectora contra picos de tráfico (Error 503 / High Demand)"""
    intentos = 3
    espera = 2  # Segundos iniciales de espera
    
    for intento in range(intentos):
        try:
            return client.models.generate_content(
                model=modelo,
                contents=contents,
                config=config
            )
        except ServerError as e:
            if "503" in str(e) or "high demand" in str(e):
                if intento < intentos - 1:
                    print(f"\n Servidor saturado (Alta demanda). Reintentando en {espera}s...")
                    time.sleep(espera)
                    espera *= 2  # Duplica el tiempo de espera (Backoff exponencial)
                    continue
            raise e

# ==============================================================================
# [TAG 6: PASO 1 - FUNCIÓN DE INTERPRETACIÓN]
# ==============================================================================
def interpretar(texto_usuario: str, usuario_id: str) -> dict:
    fecha_actual_str = datetime.now().strftime("%Y-%m-%d")
    mes_actual_str = datetime.now().strftime("%Y-%m")

    system_instruction = f"""
    Eres el motor de IA central de la app bancaria (AZUI). Clasifica la intención del usuario.
    CONTEXTO: Fecha actual: {fecha_actual_str} | Mes actual: {mes_actual_str} | Usuario ID: {usuario_id}

    INTENCIONES:
    1. 'crear_plan_inversion': Si el usuario habla de invertir, hacer crecer su dinero, buscar opciones o dónde poner a trabajar sus ahorros.
    2. 'comparar_meses': Si pide comparar periodos de gasto.
    3. 'ver_resumen': Si pregunta por saldo actual o gastos del mes.
    4. 'ver_historial': Si pide el historial, evolución o tendencia de gastos durante varios meses o años.
    5. 'no_reconocida': Frases incoherentes.

    REGLAS:
    - Asigna SIEMPRE el 'usuario_id' ({usuario_id}).
        - mes_inicio y mes_fin deben ser SIEMPRE cadenas con formato exacto YYYY-MM.
        - Convierte nombres de meses al formato YYYY-MM: enero=01, febrero=02, marzo=03,
            abril=04, mayo=05, junio=06, julio=07, agosto=08, septiembre=09,
            octubre=10, noviembre=11 y diciembre=12.
        - Si el usuario dice solo un mes sin año, usa el año más reciente en el que ese
            mes ocurrió. Si dice "diciembre" y la fecha actual es septiembre de 2026,
            devuelve "2025-12". Nunca devuelvas "diciembre", "Dic" ni otro nombre de mes.
        - Si no se menciona un periodo, deja mes_inicio y mes_fin como null.
                - Para frases como "últimos N años", calcula mes_inicio como N años atrás del mes actual
                    y mes_fin como el mes actual. Para "desde 2022", usa enero de 2022 como mes_inicio
                    y el mes actual como mes_fin. En ambos casos usa la intención 'ver_historial'.
                - Frases como "compara 2022 contra 2024" deben usar 'ver_historial' y cubrir desde
                    2022-01 hasta 2024-12, no reducir la consulta a dos meses.
    """

    response = llamada_segura_gemini(
        modelo='gemini-3.5-flash-lite',
        contents=texto_usuario,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=ContratoA,
            temperature=0.0
        ),
    )
    return json.loads(response.text)

# ==============================================================================
# [TAG 7: PASO 2 - PUENTE CON MCP Y SUPABASE]
# ==============================================================================
def consultar_patricio(contrato_a: dict) -> dict:
    intencion = contrato_a.get("intencion")
    usuario_id = contrato_a.get("usuario_id")
    params = contrato_a.get("parametros", {})

    mes_inicio = normalizar_mes(params.get("mes_inicio"))
    mes_fin = normalizar_mes(params.get("mes_fin"))

    if intencion == "ver_historial" and not mes_inicio and not mes_fin and params.get("anios"):
        try:
            cantidad_anios = int(params["anios"])
            ahora = datetime.now()
            mes_fin = ahora.strftime("%Y-%m")
            indice_mes_inicio = ahora.year * 12 + ahora.month - 1 - cantidad_anios * 12
            mes_inicio = f"{indice_mes_inicio // 12:04d}-{indice_mes_inicio % 12 + 1:02d}"
        except (TypeError, ValueError):
            mes_inicio = None

    if intencion == "crear_plan_inversion":
        return ejecutar_herramienta("analizar_inversion", usuario_id, params)

    elif intencion == "comparar_meses":
        mcp_params = {"mes_inicio": mes_inicio, "mes_fin": mes_fin}
        return ejecutar_herramienta("comparar_meses", usuario_id, mcp_params)

    elif intencion == "ver_historial":
        mcp_params = {"mes_inicio": mes_inicio, "mes_fin": mes_fin}
        return ejecutar_herramienta("historial_gastos", usuario_id, mcp_params)

    elif intencion == "ver_resumen":
        # Si el usuario pidió un rango de meses (ej. todo el año)
        if mes_inicio and mes_fin and mes_inicio != mes_fin:
            return ejecutar_herramienta("comparar_meses", usuario_id, {
                "mes_inicio": mes_inicio,
                "mes_fin": mes_fin
            })
        
        # Si solo pidió un mes en específico
        mes = mes_fin or mes_inicio or datetime.now().strftime("%Y-%m")
        return ejecutar_herramienta("resumen_categoria", usuario_id, {"mes": mes})

    else:
        return {"ok": False, "error": "Intención no soportada."}

# ==============================================================================
# [TAG 8: PASO 3 - GENERACIÓN UI SIN CONFLICTOS DE TOOLS]
# ==============================================================================
def generar_ui(contrato_a: dict, contrato_b: dict) -> dict:
    intencion = contrato_a.get("intencion")
    resultado = contrato_b.get("resultado", contrato_b)

    if not contrato_b.get("ok", True):
        return {
            "texto_respuesta": contrato_b.get("error", "No hay datos financieros disponibles para esa consulta."),
            "componente": "ninguno",
            "props": {},
        }

    if intencion == "comparar_meses":
        etiqueta_a = resultado.get("etiqueta_periodo_a") or "Periodo inicial"
        etiqueta_b = resultado.get("etiqueta_periodo_b") or "Periodo final"
        texto = (
            f"Comparé {etiqueta_a} contra {etiqueta_b} "
            f"y la variación fue de {resultado.get('porcentaje_cambio', 0)}%."
        )
        return {
            "texto_respuesta": texto,
            "componente": "grafica_comparativa",
            "props": {
                "titulo": "Comparativa de gastos",
                "etiqueta_periodo_a": etiqueta_a,
                "valor_periodo_a": float(resultado.get("valor_periodo_a") or 0),
                "etiqueta_periodo_b": etiqueta_b,
                "valor_periodo_b": float(resultado.get("valor_periodo_b") or 0),
                "porcentaje_cambio": float(resultado.get("porcentaje_cambio") or 0),
            },
        }

    if intencion == "ver_historial":
        historial = resultado.get("historial_completo") or []
        if not historial:
            return {
                "texto_respuesta": "No hay datos para ese periodo.",
                "componente": "ninguno",
                "props": {},
            }
        return {
            "texto_respuesta": (
                f"Esta es la evolución de tus gastos entre {resultado.get('mes_inicio', historial[0].get('mes'))} "
                f"y {resultado.get('mes_fin', historial[-1].get('mes'))}."
            ),
            "componente": "historial_chart",
            "props": {
                "titulo": "Historial de gastos",
                "serie": [
                    {"mes": item.get("mes", ""), "gasto": float(item.get("gasto") or 0)}
                    for item in historial
                ],
            },
        }

    if intencion == "ver_resumen":
        gasto = float(resultado.get("total") or resultado.get("gasto_mes_actual") or 0)
        texto = (
            f"Tu saldo actual es ${float(resultado.get('saldo_actual') or 0):,.2f} "
            f"con un gasto mensual de ${gasto:,.2f}."
        )
        return {
            "texto_respuesta": texto,
            "componente": "tarjeta_resumen",
            "props": {
                "saldo_actual": float(resultado.get("saldo_actual") or 0),
                "limite_mensual_tarjeta": float(resultado.get("limite_mensual_tarjeta") or 0),
                "gasto_mes_actual": gasto,
                "porcentaje_usado": float(resultado.get("porcentaje_usado") or 0),
            },
        }

    if intencion == "crear_plan_inversion":
        monto = float(resultado.get("monto_sugerido_inversion") or 0)
        monto_solicitado = resultado.get("monto_solicitado")
        texto_monto = (
            f"Tomé en cuenta tu monto de ${float(monto_solicitado):,.2f}."
            if monto_solicitado is not None
            else "Calculé el monto considerando un fondo de emergencia de 1.5 meses."
        )
        return {
            "texto_respuesta": (
                f"{texto_monto} Podrías destinar ${monto:,.2f}. "
                "Compara una alternativa gubernamental de menor riesgo con otra digital de mayor rendimiento."
            ),
            "componente": "simulador_inversion",
            "props": {
                "saldo_actual": float(resultado.get("saldo_actual") or 0),
                "gasto_ultimo_mes": float(resultado.get("gasto_ultimo_mes") or 0),
                "monto_sugerido_inversion": monto,
                "sitio_recomendado_1": resultado.get("sitio_recomendado_1"),
                "rendimiento_sitio_1": resultado.get("rendimiento_sitio_1"),
                "ganancia_anual_sitio_1": float(resultado.get("ganancia_anual_sitio_1") or 0),
                "sitio_recomendado_2": resultado.get("sitio_recomendado_2"),
                "rendimiento_sitio_2": resultado.get("rendimiento_sitio_2"),
                "ganancia_anual_sitio_2": float(resultado.get("ganancia_anual_sitio_2") or 0),
            },
        }

    return {
        "texto_respuesta": "No pude identificar una respuesta financiera clara para tu solicitud.",
        "componente": "ninguno",
        "props": {},
    }

@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "azui-finance-server"}


@app.post("/mensaje")
def mensaje_endpoint(payload: MensajeRequest) -> dict:
    if not payload.texto or not payload.texto.strip():
        raise HTTPException(status_code=400, detail="El texto del mensaje es obligatorio.")

    if not payload.usuario_id:
        raise HTTPException(status_code=400, detail="El usuario_id es obligatorio.")

    try:
        resultado_a = interpretar(texto_usuario=payload.texto, usuario_id=payload.usuario_id)
        resultado_b = consultar_patricio(resultado_a)
        resultado_c = generar_ui(contrato_a=resultado_a, contrato_b=resultado_b)
        return resultado_c
    except Exception as exc:  # pragma: no cover - defensive HTTP layer
        raise HTTPException(status_code=500, detail=f"Error al procesar el mensaje: {exc}") from exc


@app.post("/agent/turn")
def agent_turn_endpoint(payload: AgentTurnRequest) -> dict:
    if payload.event.get("type") != "app_opened":
        raise HTTPException(status_code=400, detail="Evento inicial no soportado.")

    mes_actual = datetime.now().strftime("%Y-%m")
    mes_anterior = (datetime.now().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    contrato_a = {
        "intencion": "comparar_meses",
        "usuario_id": payload.usuario_id,
        "parametros": {"mes_inicio": mes_anterior, "mes_fin": mes_actual},
    }
    contrato_b = consultar_patricio(contrato_a)
    response = generar_ui(contrato_a, contrato_b)
    response["texto_respuesta"] = "Este es tu panorama financiero reciente. Elige una accion para explorar tus datos."
    return response


@app.post("/interact")
def interact_endpoint(payload: AccionUIRequest) -> dict:
    componente = payload.contexto.get("componente")

    capability_text = {
        "view_summary": "Dame mi resumen financiero",
        "compare_months": "Compara mis gastos de los ultimos dos meses",
        "plan_investment": "Quiero planear una inversion",
        "view_history": "Dame mi historial aproximado de gastos de los ultimos 4 años",
    }
    if payload.accion in capability_text:
        mensaje = MensajeRequest(texto=capability_text[payload.accion], usuario_id=payload.usuario_id)
        return mensaje_endpoint(mensaje)

    if payload.accion == "ver_detalles" and componente == "grafica_comparativa":
        mes_inicio = payload.contexto.get("mes_inicio")
        mes_fin = payload.contexto.get("mes_fin")

        if isinstance(mes_inicio, str) and isinstance(mes_fin, str):
            contrato_a = {
                "intencion": "comparar_meses",
                "usuario_id": payload.usuario_id,
                "parametros": {"mes_inicio": mes_inicio, "mes_fin": mes_fin},
            }
            contrato_b = consultar_patricio(contrato_a)
            return generar_ui(contrato_a, contrato_b)

        return {
            "texto_respuesta": "Para mostrar el detalle necesito dos periodos válidos para comparar.",
            "componente": "ninguno",
            "props": {},
        }

    if payload.accion == "ver_detalles" and componente == "tarjeta_resumen":
        mes = payload.contexto.get("mes")
        mes = mes if isinstance(mes, str) else datetime.now().strftime("%Y-%m")
        contrato_a = {
            "intencion": "ver_resumen",
            "usuario_id": payload.usuario_id,
            "parametros": {"mes_inicio": mes, "mes_fin": mes},
        }
        contrato_b = consultar_patricio(contrato_a)
        return generar_ui(contrato_a, contrato_b)

    if payload.accion == "ver_detalles" and componente == "simulador_inversion":
        monto = payload.contexto.get("monto_inversion")
        parametros = {"monto_inversion": monto} if monto is not None else {}
        contrato_a = {
            "intencion": "crear_plan_inversion",
            "usuario_id": payload.usuario_id,
            "parametros": parametros,
        }
        contrato_b = consultar_patricio(contrato_a)
        return generar_ui(contrato_a, contrato_b)

    if payload.accion == "ver_detalle_categoria":
        return {
            "texto_respuesta": "El desglose por categoría todavía no está disponible para este periodo.",
            "componente": "ninguno",
            "props": {},
        }

    return {
        "texto_respuesta": "Acción recibida correctamente.",
        "componente": "ninguno",
        "props": {},
    }


# ==============================================================================
# [TAG 9: FLUJO PRINCIPAL]
# ==============================================================================
if __name__ == "__main__":
    import uvicorn

    print("==================================================")
    print("🔐 INICIO DE SESIÓN - AZUI BANCARIA")
    print("==================================================")

    matricula_input = input("Ingresa tu Matrícula / ID: ").strip()
    nombre_input = input("Ingresa tu Nombre: ").strip()

    usuario_id_activo = autenticar_usuario(matricula_input, nombre_input)
    if not usuario_id_activo:
        print("\n Acceso denegado.")
        exit()

    print(f"\n ¡Sesión iniciada! Usuario ID: {usuario_id_activo}")

    while True:
        frase = input("\nEscribe una frase (o 'salir'): ").strip()
        if not frase:
            continue
        if frase.lower() == 'salir':
            break

        print("\n [1/3] Interpretando intención...")
        resultado_a = interpretar(texto_usuario=frase, usuario_id=usuario_id_activo)
        print(json.dumps(resultado_a, indent=2, ensure_ascii=False))

        print("\n [2/3] Consultando BD y calculando excedente...")
        resultado_b = consultar_patricio(resultado_a)
        print(json.dumps(resultado_b, indent=2, ensure_ascii=False))

        print("\n [3/3] Generando UI...")
        resultado_c = generar_ui(contrato_a=resultado_a, contrato_b=resultado_b)
        print(json.dumps(resultado_c, indent=2, ensure_ascii=False))

    print("\nSaliendo del sistema AZUI.")
else:
    uvicorn = None