import os
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from main import ContratoC, consultar_patricio, generar_ui, interpretar


class AccionUIRequest(BaseModel):
    tipo: str = Field(pattern="^accion_ui$")
    accion: str = Field(min_length=1)
    usuario_id: str = Field(min_length=1)
    contexto: dict[str, Any] = Field(default_factory=dict)


class MensajeTextoRequest(BaseModel):
    texto: str = Field(min_length=1)
    usuario_id: str = Field(min_length=1)


app = FastAPI(title="AZUI Finance API")

allowed_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/interact", response_model=ContratoC)
def interact(payload: AccionUIRequest) -> ContratoC:
    if payload.accion not in {"ver_detalles", "ver_detalle_categoria"}:
        raise HTTPException(status_code=400, detail="Unsupported accion_ui action")

    mes = payload.contexto.get("mes") or datetime.now().strftime("%Y-%m")
    contrato_a = {
        "intencion": "ver_resumen",
        "usuario_id": payload.usuario_id,
        "parametros": {"mes_inicio": None, "mes_fin": mes},
        "confianza": "alta",
        "nota_usuario": None,
    }

    try:
        contrato_b = consultar_patricio(contrato_a)
        return generar_ui(contrato_a, contrato_b)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/mensaje", response_model=ContratoC)
def mensaje(payload: MensajeTextoRequest) -> ContratoC:
    try:
        contrato_a = interpretar(
            texto_usuario=payload.texto,
            usuario_id=payload.usuario_id,
        )
        contrato_b = consultar_patricio(contrato_a)
        return generar_ui(contrato_a=contrato_a, contrato_b=contrato_b)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc