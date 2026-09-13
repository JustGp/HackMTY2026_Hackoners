from typing import Callable
from core.contract import (
    build_success,
    build_error,
    ParametroFaltanteError,
    DatabaseError,
)

# Importamos directamente la función 'ejecutar' de cada archivo hijo
from .comparar_meses import ejecutar as ejecutar_comparar_meses
from .resumen_categoria import ejecutar as ejecutar_resumen_categoria
from .analizar_inversion import ejecutar as ejecutar_analizar_inversion
from .historial_gastos import ejecutar as ejecutar_historial_gastos

REGISTRY: dict[str, Callable[[str, dict], dict]] = {
    "comparar_meses": ejecutar_comparar_meses,
    "resumen_categoria": ejecutar_resumen_categoria,
    "analizar_inversion": ejecutar_analizar_inversion,
    "historial_gastos": ejecutar_historial_gastos,
}

def ejecutar_herramienta(nombre_herramienta: str, usuario_id: str, parametros: dict | None) -> dict:
    handler = REGISTRY.get(nombre_herramienta)
    if handler is None:
        return build_error(nombre_herramienta, f"Herramienta '{nombre_herramienta}' no registrada.")

    try:
        resultado = handler(usuario_id, parametros or {})
        return build_success(nombre_herramienta, resultado)
    except ParametroFaltanteError as exc:
        return build_error(nombre_herramienta, str(exc))
    except DatabaseError as exc:
        return build_error(nombre_herramienta, str(exc))
    except Exception as exc:
        return build_error(nombre_herramienta, f"Error inesperado: {exc}")