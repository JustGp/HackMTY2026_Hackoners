# ==============================================================================
# [TAG 1: IMPORTACIONES Y LIBRERÍAS]
# ==============================================================================
import json
import warnings
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
import os

# Importamos la conexión a BD y el ejecutor de herramientas de Patricio
from core.db import get_supabase_client
from tools import ejecutar_herramienta

warnings.filterwarnings("ignore")

# ==============================================================================
# [TAG 2: AUTENTICACIÓN ESTRICTA Y BLINDADA]
# ==============================================================================
def autenticar_usuario(matricula: str, nombre: str) -> Optional[str]:
    """
    Valida estrictamente que TANTO el ID como el Nombre coincidan 
    exactamente con los registros de la tabla 'usuarios' en Supabase.
    """
    try:
        client = get_supabase_client()
        
        # Consultamos la tabla 'usuarios'
        response = client.table("usuarios").select("id, nombre").execute()
        filas = response.data or []

        input_matricula = matricula.strip()
        input_nombre = nombre.strip().lower()

        for fila in filas:
            db_id = str(fila.get("id"))
            db_nombre = str(fila.get("nombre", "")).strip().lower()

            # Validación estricta: ID exacto Y el nombre debe coincidir
            if db_id == input_matricula and input_nombre == db_nombre:
                return db_id

    except Exception as e:
        print(f" Error al consultar la tabla 'usuarios' en Supabase: {e}")
        return None

    # Si no coinciden ambos datos, se niega el acceso
    return None


# ==============================================================================
# [TAG 3: DEFINICIÓN DEL CONTRATO A - PYDANTIC ACTUALIZADO]
# ==============================================================================
class ParametrosRango(BaseModel):
    mes_inicio: Optional[str] = Field(
        default=None, 
        description="Mes inicial del periodo o rango en formato YYYY-MM."
    )
    mes_fin: Optional[str] = Field(
        default=None, 
        description="Mes final o mes actual en formato YYYY-MM."
    )

class ContratoA(BaseModel):
    intencion: Literal["comparar_meses", "ver_resumen", "no_reconocida"]
    usuario_id: str
    parametros: ParametrosRango
    confianza: Literal["alta", "media", "baja"]
    nota_usuario: Optional[str] = Field(
        default=None, 
        description="Aclaración amable sobre el rango de tiempo analizado."
    )


# ==============================================================================
# [TAG 4: DEFINICIÓN DEL CONTRATO C - PYDANTIC]
# ==============================================================================
class PropsUI(BaseModel):
    titulo: Optional[str] = Field(default=None, description="Título descriptivo de la gráfica o resumen.")
    etiqueta_periodo_a: Optional[str] = Field(default=None, description="Nombre del primer periodo, ej. 'Agosto'.")
    valor_periodo_a: Optional[float] = Field(default=None, description="Gasto total del primer periodo.")
    etiqueta_periodo_b: Optional[str] = Field(default=None, description="Nombre del segundo periodo, ej. 'Septiembre'.")
    valor_periodo_b: Optional[float] = Field(default=None, description="Gasto total del segundo periodo.")
    porcentaje_cambio: Optional[float] = Field(default=None, description="Variación porcentual entre los dos periodos.")
    saldo_actual: Optional[float] = Field(default=None, description="Saldo actual disponible.")
    limite_mensual_tarjeta: Optional[float] = Field(default=None, description="Límite de la tarjeta.")
    gasto_mes_actual: Optional[float] = Field(default=None, description="Gasto del mes actual.")
    porcentaje_usado: Optional[float] = Field(default=None, description="Porcentaje del límite usado.")

class ContratoC(BaseModel):
    texto_respuesta: str = Field(description="Mensaje amigable, empático y tipo TikTok explicando los datos. Máximo 2 oraciones.")
    componente: Literal["grafica_comparativa", "tarjeta_resumen", "ninguno"]
    props: PropsUI = Field(description="Estructura con los datos exactos para renderizar el componente en la UI.")


# ==============================================================================
# [TAG 5: CONEXIÓN CON LA API DE GEMINI]
# ==============================================================================
API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY)


# ==============================================================================
# [TAG 6: PASO 1 - FUNCIÓN DE INTERPRETACIÓN (EL CEREBRO DE ALAN)]
# ==============================================================================
def interpretar(texto_usuario: str, usuario_id: str) -> dict:
    fecha_actual_str = datetime.now().strftime("%Y-%m-%d")
    mes_actual_str = datetime.now().strftime("%Y-%m")

    system_instruction = f"""
    Eres el motor de IA central de la app bancaria (AZUI).
    Tu trabajo es interpretar lo que dice el cliente y clasificar su intención en EL CONTRATO A.

    INFORMACIÓN DE CONTEXTO TEMPORAL Y USUARIO:
    - Fecha actual del sistema: {fecha_actual_str}
    - Mes actual: {mes_actual_str}
    - ID del Usuario Autenticado: {usuario_id}

    INTENCIONES DISPONIBLES:
    1. 'comparar_meses': Si el usuario pide comparar periodos, ver el comportamiento de un rango de tiempo, el "último año", o múltiples meses.
    2. 'ver_resumen': Si el usuario pregunta por su saldo actual o gasto específico de un solo mes.
    3. 'no_reconocida': Si la frase es incoherente o no financiera.

    REGLAS ESTRICTAS PARA FECHAS Y PARÁMETROS:
    - Asigna SIEMPRE el 'usuario_id' recibido ({usuario_id}).
    - Si el usuario pide el "último año" o un rango de varios meses:
      * mes_fin = Mes actual ({mes_actual_str}).
      * mes_inicio = Exactamente 12 meses atrás en formato YYYY-MM.
    - Si pide comparar dos meses específicos, asigna el más antiguo a mes_inicio y el más reciente a mes_fin.
    """

    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=texto_usuario,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=ContratoA,
            temperature=0.1
        ),
    )

    return json.loads(response.text)


# ==============================================================================
# [TAG 7: PASO 2 - PUENTE CON EL BACKEND DE PATRICIO / SUPABASE]
# ==============================================================================
def consultar_patricio(contrato_a: dict) -> dict:
    intencion = contrato_a.get("intencion")
    usuario_id = contrato_a.get("usuario_id")
    params = contrato_a.get("parametros", {})

    if intencion == "comparar_meses":
        mcp_params = {
            "mes_inicio": params.get("mes_inicio"),
            "mes_fin": params.get("mes_fin")
        }
        return ejecutar_herramienta("comparar_meses", usuario_id, mcp_params)

    elif intencion == "ver_resumen":
        mes = params.get("mes_fin") or params.get("mes_inicio") or datetime.now().strftime("%Y-%m")
        mcp_params = {"mes": mes}
        return ejecutar_herramienta("resumen_categoria", usuario_id, mcp_params)

    else:
        return {
            "ok": False,
            "herramienta": "ninguna",
            "resultado": None,
            "error": "Intención no reconocida o no soportada."
        }



# ==============================================================================
# [TAG 8: PASO 3 - FUNCIÓN DE GENERACIÓN UI (CONTRATO C PARA GAEL)]
# ==============================================================================
def generar_ui(contrato_a: dict, contrato_b: dict) -> dict:
    system_instruction = f"""
    Eres el redactor final de la app financiera (AZUI). Tu objetivo es tomar datos 
    crudos de la base de datos y formatearlos para la interfaz de usuario.
    
    Tono: Amigable, digerible, directo al grano (tipo TikTok, enfocado a jóvenes).

    DATOS DE ENTRADA:
    - Lo que el usuario quería (Contrato A): {json.dumps(contrato_a)}
    - Lo que devolvió la Base de Datos (Contrato B): {json.dumps(contrato_b)} (Nota: Los datos reales están dentro de la llave 'resultado').

    REGLAS DE SALIDA (CONTRATO C - PROPSUI):
    1. 'texto_respuesta': Explica brevemente el resultado de forma atractiva. Si hay una 'nota_usuario' en el Contrato A, inclúyela.
    2. 'componente': Si la intención era 'comparar_meses', usa 'grafica_comparativa'. Si era 'ver_resumen', usa 'tarjeta_resumen'.
    3. 'props': **OBLIGATORIO**. Debes extraer y rellenar TODOS los campos disponibles que vienen dentro de 'resultado' del Contrato B hacia las props correspondientes:
       - 'titulo': Pon un título descriptivo (ej. "Comparativa de gastos").
       - 'etiqueta_periodo_a' y 'valor_periodo_a': Cópialos de 'etiqueta_periodo_a' y 'valor_periodo_a' del resultado.
       - 'etiqueta_periodo_b' y 'valor_periodo_b': Cópialos de 'etiqueta_periodo_b' y 'valor_periodo_b' del resultado.
       - 'porcentaje_cambio': Cópialo del resultado.
       - 'saldo_actual': Cópialo de 'saldo_actual' del resultado (¡NUNCA lo dejes en null si viene en la BD!).
       - 'limite_mensual_tarjeta': Cópialo de 'limite_mensual_tarjeta' del resultado.
       - 'gasto_mes_actual': Cópialo de 'gasto_mes_actual' del resultado.
       - 'porcentaje_usado': Cópialo de 'porcentaje_usado' del resultado.
    """
    
    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents="Formatea estos datos para la UI basándote en las instrucciones.",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=ContratoC,
            temperature=0.2 # Bajamos un poco la temperatura para que sea más obediente copiando datos
        ),
    )

    return json.loads(response.text)


# ==============================================================================
# [TAG 9: INICIO DE SESIÓN Y FLUJO PRINCIPAL]
# ==============================================================================
if __name__ == "__main__":
    print("==================================================")
    print(" INICIO DE SESIÓN - AZUI BANCARIA")
    print("==================================================")
    
    matricula_input = input("Ingresa tu Matrícula / ID (ej. 1 para Alejandro Garza): ").strip()
    nombre_input = input("Ingresa tu Nombre (ej. Alejandro Garza): ").strip()

    usuario_id_activo = autenticar_usuario(matricula_input, nombre_input)

    if not usuario_id_activo:
        print("\n Error: Matrícula o nombre no encontrados en la tabla 'usuarios'. Acceso denegado.")
        exit()

    print(f"\n ¡Sesión iniciada con éxito!")
    print(f" Usuario activo: {nombre_input} (ID BD: {usuario_id_activo})")
    print("==================================================")

    while True:
        frase = input("\nEscribe una frase de prueba (o escribe 'salir'): ").strip()
        
        if not frase:
            continue
            
        if frase.lower() == 'salir':
            print("¡Hasta luego!")
            break
            
        print("\n [1/3] Interpretando intención (Contrato A)...")
        resultado_a = interpretar(texto_usuario=frase, usuario_id=usuario_id_activo)
        print(json.dumps(resultado_a, indent=2, ensure_ascii=False))
        
        print(f"\n [2/3] Consultando Supabase para el usuario '{usuario_id_activo}' (Contrato B)...")
        resultado_b = consultar_patricio(resultado_a)
        print(json.dumps(resultado_b, indent=2, ensure_ascii=False))
        
        print("\n [3/3] Generando estructura visual final para Gael (Contrato C)...")
        resultado_c = generar_ui(contrato_a=resultado_a, contrato_b=resultado_b)
        
        print("\n --- SALIDA FINAL PARA LA UI (CONTRATO C) --- 🚀")
        print(json.dumps(resultado_c, indent=2, ensure_ascii=False))