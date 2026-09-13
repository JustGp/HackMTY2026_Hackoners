from core.db import get_supabase_client
from core.contract import ParametroFaltanteError, DatabaseError

def ejecutar(usuario_id: str, parametros: dict) -> dict:
    if not usuario_id:
        raise ParametroFaltanteError("El campo 'usuario_id' es obligatorio")

    monto_solicitado = parametros.get("monto_inversion")
    if monto_solicitado is not None:
        try:
            monto_solicitado = float(monto_solicitado)
        except (TypeError, ValueError) as exc:
            raise ParametroFaltanteError("'monto_inversion' debe ser un número") from exc
        if monto_solicitado <= 0:
            raise ParametroFaltanteError("'monto_inversion' debe ser mayor que cero")

    client = get_supabase_client()
    try:
        # 1. Obtener saldo actual de la cuenta
        saldo_res = client.table("saldos_cuenta").select("saldo_actual").eq("usuario_id", usuario_id).order("mes", desc=True).limit(1).execute()
        saldo_actual = float(saldo_res.data[0]["saldo_actual"]) if saldo_res.data else 0.0

        # 2. Obtener el gasto del último mes para calcular el costo de vida
        gasto_res = client.table("gastos_mensuales").select("gasto_mensual").eq("usuario_id", usuario_id).order("mes", desc=True).limit(1).execute()
        gasto_ultimo_mes = float(gasto_res.data[0]["gasto_mensual"]) if gasto_res.data else 0.0

    except Exception as exc:
        raise DatabaseError(f"Error al consultar Supabase: {exc}") from exc

    # Lógica financiera: Dejamos 1.5 meses de gastos como "Fondo de Emergencia" intocable
    fondo_emergencia = gasto_ultimo_mes * 1.5
    monto_sugerido = saldo_actual - fondo_emergencia
    monto_sugerido = monto_sugerido if monto_sugerido > 0 else (saldo_actual * 0.1)
    if monto_solicitado is not None:
        monto_sugerido = monto_solicitado

    rendimiento_seguro = 0.09
    rendimiento_alto = 0.12

    return {
        "usuario_id": usuario_id,
        "saldo_actual": saldo_actual,
        "gasto_ultimo_mes": gasto_ultimo_mes,
        "monto_sugerido_inversion": round(monto_sugerido, 2),
        "monto_solicitado": monto_solicitado,
        "sitio_recomendado_1": "Inversión Segura con el Gobierno (Cetes)",
        "rendimiento_sitio_1": "9% anual de referencia; verifica la tasa vigente",
        "ganancia_anual_sitio_1": round(monto_sugerido * rendimiento_seguro, 2),
        "sitio_recomendado_2": "Cuenta Digital de Alto Rendimiento (como Nu o Klar)",
        "rendimiento_sitio_2": "12% anual de referencia; verifica condiciones y protección vigente",
        "ganancia_anual_sitio_2": round(monto_sugerido * rendimiento_alto, 2),
    }