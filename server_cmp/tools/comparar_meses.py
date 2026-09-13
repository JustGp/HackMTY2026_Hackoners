from datetime import datetime
from core.db import get_supabase_client
from core.contract import ParametroFaltanteError, DatabaseError

REQUIRED_PARAMS = ["mes_inicio", "mes_fin"]

def _validar_parametros(parametros: dict) -> None:
    faltantes = [p for p in REQUIRED_PARAMS if not parametros.get(p)]
    if faltantes:
        raise ParametroFaltanteError(f"Faltan los parámetros: {', '.join(faltantes)}")

    for campo in REQUIRED_PARAMS:
        valor = parametros[campo]
        try:
            datetime.strptime(valor, "%Y-%m")
        except ValueError:
            raise ParametroFaltanteError(f"El parámetro '{campo}' debe ser 'YYYY-MM', recibido: '{valor}'")

def ejecutar(usuario_id: str, parametros: dict) -> dict:
    if not usuario_id:
        raise ParametroFaltanteError("El campo 'usuario_id' es obligatorio")

    _validar_parametros(parametros)

    mes_inicio = parametros["mes_inicio"] + "-01"
    mes_fin = parametros["mes_fin"] + "-01"

    client = get_supabase_client()
    try:
        # 1. Consultar gastos del rango completo
        gastos_res = (
            client.table("gastos_mensuales")
            .select("mes, gasto_mensual")
            .eq("usuario_id", usuario_id)
            .gte("mes", mes_inicio)
            .lte("mes", mes_fin)
            .order("mes", desc=False)
            .execute()
        )

        # 2. Consultar el límite mensual del mes más reciente
        limite_res = (
            client.table("limites_mensuales")
            .select("limite_mensual")
            .eq("usuario_id", usuario_id)
            .eq("mes", mes_fin)
            .execute()
        )

        # 3. Consultar saldo actual de la cuenta
        saldo_res = (
            client.table("saldos_cuenta")
            .select("saldo_actual")
            .eq("usuario_id", usuario_id)
            .order("mes", desc=True)
            .limit(1)
            .execute()
        )

    except Exception as exc:
        raise DatabaseError(f"Error al consultar Supabase: {exc}") from exc

    filas_gastos = gastos_res.data or []
    
    if not filas_gastos:
        raise DatabaseError("No hay datos para ese periodo")

    # Extraemos el primer y último mes del resultado obtenido
    primer_mes_data = filas_gastos[0]
    ultimo_mes_data = filas_gastos[-1]

    val_a = float(primer_mes_data.get("gasto_mensual", 0.0))
    val_b = float(ultimo_mes_data.get("gasto_mensual", 0.0))

    # Cálculo de variación porcentual entre el inicio y el fin del rango
    diferencia = val_b - val_a
    variacion_pct = round((diferencia / val_a) * 100, 2) if val_a != 0 else 0.0

    saldo_actual = float(saldo_res.data[0]["saldo_actual"]) if saldo_res.data else 0.0
    limite_tarjeta = float(limite_res.data[0]["limite_mensual"]) if limite_res.data else 0.0
    
    porcentaje_usado = round((val_b / limite_tarjeta) * 100, 2) if limite_tarjeta > 0 else 0.0

    return {
        "usuario_id": usuario_id,
        "etiqueta_periodo_a": primer_mes_data.get("mes")[:7],
        "valor_periodo_a": val_a,
        "etiqueta_periodo_b": ultimo_mes_data.get("mes")[:7],
        "valor_periodo_b": val_b,
        "porcentaje_cambio": variacion_pct,
        "saldo_actual": saldo_actual,
        "limite_mensual_tarjeta": limite_tarjeta,
        "gasto_mes_actual": val_b,
        "porcentaje_usado": porcentaje_usado,
        "historial_completo": [{"mes": f.get("mes")[:7], "gasto": float(f.get("gasto_mensual"))} for f in filas_gastos]
    }