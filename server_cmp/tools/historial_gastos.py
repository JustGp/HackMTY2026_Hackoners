from datetime import datetime

from core.contract import DatabaseError, ParametroFaltanteError
from core.db import get_supabase_client


def _validar_parametros(parametros: dict) -> tuple[str, str]:
    mes_inicio = parametros.get("mes_inicio")
    mes_fin = parametros.get("mes_fin")

    anios = parametros.get("anios")
    if anios is not None and (mes_inicio is None or mes_fin is None):
        try:
            cantidad_anios = int(anios)
        except (TypeError, ValueError) as exc:
            raise ParametroFaltanteError("'anios' debe ser un número entero") from exc
        if cantidad_anios <= 0:
            raise ParametroFaltanteError("'anios' debe ser mayor que cero")

        ahora = datetime.now()
        mes_fin = ahora.strftime("%Y-%m")
        total_meses = cantidad_anios * 12
        indice_mes_inicio = ahora.year * 12 + (ahora.month - 1) - total_meses
        mes_inicio = f"{indice_mes_inicio // 12:04d}-{indice_mes_inicio % 12 + 1:02d}"

    faltantes = [
        nombre
        for nombre, valor in (("mes_inicio", mes_inicio), ("mes_fin", mes_fin))
        if not valor
    ]
    if faltantes:
        raise ParametroFaltanteError(f"Faltan los parámetros: {', '.join(faltantes)}")

    for campo, valor in (("mes_inicio", mes_inicio), ("mes_fin", mes_fin)):
        try:
            datetime.strptime(valor, "%Y-%m")
        except (TypeError, ValueError) as exc:
            raise ParametroFaltanteError(
                f"El parámetro '{campo}' debe ser 'YYYY-MM', recibido: '{valor}'"
            ) from exc

    return mes_inicio, mes_fin


def ejecutar(usuario_id: str, parametros: dict) -> dict:
    if not usuario_id:
        raise ParametroFaltanteError("El campo 'usuario_id' es obligatorio")

    mes_inicio, mes_fin = _validar_parametros(parametros)
    client = get_supabase_client()

    try:
        gastos_res = (
            client.table("gastos_mensuales")
            .select("mes, gasto_mensual")
            .eq("usuario_id", usuario_id)
            .gte("mes", f"{mes_inicio}-01")
            .lte("mes", f"{mes_fin}-01")
            .order("mes", desc=False)
            .execute()
        )
    except Exception as exc:
        raise DatabaseError(f"Error al consultar Supabase: {exc}") from exc

    filas = gastos_res.data or []
    if not filas:
        raise DatabaseError("No hay datos para ese periodo")

    historial = [
        {
            "mes": str(fila.get("mes", ""))[:7],
            "gasto": float(fila.get("gasto_mensual") or 0),
        }
        for fila in filas
    ]

    return {
        "usuario_id": usuario_id,
        "mes_inicio": mes_inicio,
        "mes_fin": mes_fin,
        "historial_completo": historial,
    }
