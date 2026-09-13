import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Cargar variables de entorno al iniciar
load_dotenv()

@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_key: str

def load_settings() -> Settings:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    faltantes = [
        nombre
        for nombre, valor in (("SUPABASE_URL", url), ("SUPABASE_KEY", key))
        if not valor
    ]
    if faltantes:
        raise RuntimeError(
            "Variables de entorno faltantes: "
            + ", ".join(faltantes)
            + ". Revisa tu archivo .env."
        )

    return Settings(supabase_url=url, supabase_key=key)