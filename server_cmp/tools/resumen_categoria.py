from datetime import datetime
from core.db import get_supabase_client
from core.contract import ParametroFaltanteError, DatabaseError

REQUIRED_PARAMS = ["mes"]

def _validar_parametros(parametros: dict) -> None:
    faltantes = [p for p in REQUIRED_PARAMS if not parametros.get(p)]
    if faltantes:
        raise ParametroFaltanteError(f"Faltan los parámetros: {', '.join(faltantes)}")
    try:
        datetime.strptime(parametros["mes"], "%Y-%m")
    except ValueError:
        raise ParametroFaltanteError(f"El parámetro 'mes' debe ser 'YYYY-MM', recibido: '{parametros['mes']}'")

def ejecutar(usuario_id: str, parametros: dict) -> dict:
    if not usuario_id:
        raise ParametroFaltanteError("El campo 'usuario_id' es obligatorio")

    _validar_parametros(parametros)
    mes = parametros["mes"]
    fecha_busqueda = f"{mes}-01"

    client = get_supabase_client()
    try:
        # Consultamos el resumen financiero general del usuario
        resumen_res = client.table("resumen_financiero").select("*").eq("usuario_id", usuario_id).execute()
        info_general = resumen_res.data[0] if resumen_res.data else {}

        # Consultamos el gasto específico de ese mes
        gasto_res = client.table("gastos_mensuales").select("gasto_mensual").eq("usuario_id", usuario_id).eq("mes", fecha_busqueda).execute()
        total_gasto = float(gasto_res.data[0]["gasto_mensual"]) if gasto_res.data else 0.0

    except Exception as exc:
        raise DatabaseError(f"Error al consultar Supabase: {exc}") from exc

    return {
        "usuario_id": usuario_id,
        "mes": mes,
        "total": round(total_gasto, 2),
        "saldo_actual": float(info_general.get("saldo_actual", 0.0)),
        "limite_mensual_tarjeta": float(info_general.get("limite_mensual", 0.0)),
    }