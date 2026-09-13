class ParametroFaltanteError(Exception):
    pass

class DatabaseError(Exception):
    pass

def build_success(nombre_herramienta: str, resultado: dict) -> dict:
    return {
        "ok": True,
        "herramienta": nombre_herramienta,
        "resultado": resultado,
        "error": None
    }

def build_error(nombre_herramienta: str, error_msg: str) -> dict:
    return {
        "ok": False,
        "herramienta": nombre_herramienta,
        "resultado": None,
        "error": error_msg
    }