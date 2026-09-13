# ==============================================================================
# [TAG 1: IMPORTACIONES Y LIBRERÍAS]
# ==============================================================================
import json
import os
import time
import warnings
from datetime import datetime
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
    monto_inversion: Optional[float] = Field(default=None, description="Monto explícito si el usuario lo menciona.")

class ContratoA(BaseModel):
    intencion: Literal["comparar_meses", "ver_resumen", "crear_plan_inversion", "no_reconocida"]
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

class ContratoC(BaseModel):
    texto_respuesta: str = Field(description="Mensaje amigable explicando la recomendación.")
    componente: Literal["grafica_comparativa", "tarjeta_resumen", "tabla_categorias", "simulador_inversion", "ninguno"]
    props: PropsUI

class MensajeRequest(BaseModel):
    texto: str
    usuario_id: str

class AccionUIRequest(BaseModel):
    tipo: str = Field(default="accion_ui")
    accion: str
    usuario_id: str
    contexto: dict = Field(default_factory=dict)

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
    4. 'no_reconocida': Frases incoherentes.

    REGLAS:
    - Asigna SIEMPRE el 'usuario_id' ({usuario_id}).
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

    if intencion == "crear_plan_inversion":
        return ejecutar_herramienta("analizar_inversion", usuario_id, params)

    elif intencion == "comparar_meses":
        mcp_params = {"mes_inicio": params.get("mes_inicio"), "mes_fin": params.get("mes_fin")}
        return ejecutar_herramienta("comparar_meses", usuario_id, mcp_params)

    elif intencion == "ver_resumen":
        mes_inicio = params.get("mes_inicio")
        mes_fin = params.get("mes_fin")
        
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
        return {
            "texto_respuesta": (
                f"Con base en tu saldo y gastos, podrías destinar ${monto:,.2f} a una estrategia de inversión segura."
            ),
            "componente": "simulador_inversion",
            "props": {
                "saldo_actual": float(resultado.get("saldo_actual") or 0),
                "gasto_ultimo_mes": float(resultado.get("gasto_ultimo_mes") or 0),
                "monto_sugerido_inversion": monto,
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


@app.post("/interact")
def interact_endpoint(payload: AccionUIRequest) -> dict:
    componente = payload.contexto.get("componente")

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
        print("\n❌ Acceso denegado.")
        exit()

    print(f"\n✅ ¡Sesión iniciada! Usuario ID: {usuario_id_activo}")

    while True:
        frase = input("\nEscribe una frase (o 'salir'): ").strip()
        if not frase:
            continue
        if frase.lower() == 'salir':
            break

        print("\n⏳ [1/3] Interpretando intención...")
        resultado_a = interpretar(texto_usuario=frase, usuario_id=usuario_id_activo)
        print(json.dumps(resultado_a, indent=2, ensure_ascii=False))

        print("\n⏳ [2/3] Consultando BD y calculando excedente...")
        resultado_b = consultar_patricio(resultado_a)
        print(json.dumps(resultado_b, indent=2, ensure_ascii=False))

        print("\n⏳ [3/3] Generando UI...")
        resultado_c = generar_ui(contrato_a=resultado_a, contrato_b=resultado_b)
        print(json.dumps(resultado_c, indent=2, ensure_ascii=False))

    print("\nSaliendo del sistema AZUI.")
else:
    uvicorn = None