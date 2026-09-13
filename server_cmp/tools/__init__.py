from typing import Callable
from core.contract import (
    build_success,
    build_error,
    ParametroFaltanteError,
    DatabaseError,
)
# IMPORTACIÓN RELATIVA CORREGIDA
from . import comparar_meses, resumen_categoria

REGISTRY: dict[str, Callable[[str, dict], dict]] = {
    "comparar_meses": comparar_meses.ejecutar,
    "resumen_categoria": resumen_categoria.ejecutar,
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