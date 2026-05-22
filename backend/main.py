from pathlib import Path
from typing import List

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="API RiskCoop - Modelos de mora y recuperacion")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_RECUPERACION_PATH = BASE_DIR / "models" / "modelo_recuperacion_mora_umbral_060.pkl"
MODEL_RIESGO_PATH = BASE_DIR / "models" / "modelo_mora_v6_umbral_0782.pkl"

artefacto_recuperacion = joblib.load(MODEL_RECUPERACION_PATH)
modelo_recuperacion = artefacto_recuperacion["modelo"]
umbral_recuperacion = artefacto_recuperacion.get("umbral_recuperacion", 0.60)

artefacto_riesgo = joblib.load(MODEL_RIESGO_PATH)
modelo_riesgo = artefacto_riesgo["modelo"]
umbral_riesgo = artefacto_riesgo.get("umbral", 0.50)


class DatosCliente(BaseModel):
    monto_credito: float
    saldo_pendiente: float
    plazo: float
    dias_atraso_actual: float
    numero_cuotas_pendientes: float
    numero_cuotas_atrasadas: float
    promedio_dias_atraso: float
    max_dias_atraso: float
    numero_pagos_tarde: float
    porcentaje_pagos_tarde: float
    ultimo_pago_tarde: float
    dias_desde_ultimo_pago: float
    saldo_actual: float
    saldo_anterior: float
    variacion_saldo_limpia: float
    numero_transacciones: float
    monto_total_movido: float
    monto_promedio_transaccion: float
    variacion_movimientos: float
    variacion_monto_movido: float
    nro_cargas_fam: float
    estado_civil: str
    nivel_educa: str
    estado_op: str


class DatosClienteConId(DatosCliente):
    cliente_id: str | None = None
    operacion_id: str | None = None


def _features_frame(rows: List[DatosCliente]) -> pd.DataFrame:
    return pd.DataFrame([row.model_dump(exclude={"cliente_id", "operacion_id"}) for row in rows])


def _predict_rows(rows: List[DatosClienteConId]):
    df = _features_frame(rows)
    riesgo_probs = modelo_riesgo.predict_proba(df)[:, 1]
    recuperacion_probs = modelo_recuperacion.predict_proba(df)[:, 1]

    results = []
    for index, row in enumerate(rows):
        prob_riesgo = float(riesgo_probs[index])
        prob_recuperacion = float(recuperacion_probs[index])
        riesgo_pred = int(prob_riesgo >= umbral_riesgo)
        recuperacion_pred = int(prob_recuperacion >= umbral_recuperacion)
        results.append(
            {
                "cliente_id": row.cliente_id,
                "operacion_id": row.operacion_id,
                "probabilidad_riesgo": round(prob_riesgo, 4),
                "probabilidad_recuperacion": round(prob_recuperacion, 4),
                "umbral_riesgo": umbral_riesgo,
                "umbral_recuperacion": umbral_recuperacion,
                "prediccion_riesgo": riesgo_pred,
                "prediccion_recuperacion": recuperacion_pred,
                "resultado_riesgo": "Alto riesgo de mora" if riesgo_pred == 1 else "Bajo riesgo de mora",
                "resultado_recuperacion": (
                    "Alta probabilidad de recuperacion"
                    if recuperacion_pred == 1
                    else "Baja probabilidad de recuperacion"
                ),
            }
        )
    return results


def _predict_recovery_rows(rows: List[DatosClienteConId]):
    df = _features_frame(rows)
    recuperacion_probs = modelo_recuperacion.predict_proba(df)[:, 1]

    results = []
    for index, row in enumerate(rows):
        prob_recuperacion = float(recuperacion_probs[index])
        recuperacion_pred = int(prob_recuperacion >= umbral_recuperacion)
        results.append(
            {
                "cliente_id": row.cliente_id,
                "operacion_id": row.operacion_id,
                "probabilidad_recuperacion": round(prob_recuperacion, 4),
                "umbral_recuperacion": umbral_recuperacion,
                "prediccion_recuperacion": recuperacion_pred,
                "resultado_recuperacion": (
                    "Alta probabilidad de recuperacion"
                    if recuperacion_pred == 1
                    else "Baja probabilidad de recuperacion"
                ),
            }
        )
    return results


@app.get("/")
def inicio():
    return {
        "mensaje": "API RiskCoop funcionando",
        "modelos": ["riesgo_mora", "recuperacion_mora"],
        "umbral_riesgo": umbral_riesgo,
        "umbral_recuperacion": umbral_recuperacion,
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict-recuperacion")
def predecir_recuperacion(datos: DatosCliente):
    df = pd.DataFrame([datos.model_dump()])
    probabilidad = float(modelo_recuperacion.predict_proba(df)[0][1])
    prediccion = int(probabilidad >= umbral_recuperacion)

    return {
        "modelo": "recuperacion_mora",
        "probabilidad_recuperacion": round(probabilidad, 4),
        "umbral": umbral_recuperacion,
        "prediccion": prediccion,
        "resultado": "Alta probabilidad de recuperacion" if prediccion == 1 else "Baja probabilidad de recuperacion",
    }


@app.post("/predict-riesgo")
def predecir_riesgo(datos: DatosCliente):
    df = pd.DataFrame([datos.model_dump()])
    probabilidad = float(modelo_riesgo.predict_proba(df)[0][1])
    prediccion = int(probabilidad >= umbral_riesgo)

    return {
        "modelo": "riesgo_mora",
        "probabilidad_riesgo": round(probabilidad, 4),
        "umbral": umbral_riesgo,
        "prediccion": prediccion,
        "resultado": "Alto riesgo de mora" if prediccion == 1 else "Bajo riesgo de mora",
    }


@app.post("/predict")
def predecir(datos: DatosClienteConId):
    return _predict_rows([datos])[0]


@app.post("/predict-batch")
def predecir_lote(datos: List[DatosClienteConId]):
    return {"predicciones": _predict_rows(datos)}


@app.post("/predict-recuperacion-batch")
def predecir_recuperacion_lote(datos: List[DatosClienteConId]):
    return {"predicciones": _predict_recovery_rows(datos)}
