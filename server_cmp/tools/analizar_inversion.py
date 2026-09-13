from core.db import get_supabase_client
from core.contract import ParametroFaltanteError, DatabaseError

def ejecutar(usuario_id: str, parametros: dict) -> dict:
    if not usuario_id:
        raise ParametroFaltanteError("El campo 'usuario_id' es obligatorio")

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

    return {
        "usuario_id": usuario_id,
        "saldo_actual": saldo_actual,
        "gasto_ultimo_mes": gasto_ultimo_mes,
        "monto_sugerido_inversion": round(monto_sugerido, 2)
    }