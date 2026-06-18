import sys
import json
import os
import pandas as pd
import numpy as np
import joblib

# =========================
# PATHS
# =========================
DOSSIER = os.path.dirname(os.path.abspath(__file__))
CHEMIN_CSV = os.path.join(DOSSIER, "..", "exportIA.csv")
CHEMIN_MODELE = os.path.join(DOSSIER, "..", "modeles_pkl", "kmeans_bornes.pkl")

# =========================
# INPUT
# =========================
ids = sys.argv[1] if len(sys.argv) > 1 else None

if ids is None:
    print(json.dumps({"error": "no ids provided"}))
    sys.exit()

ids_list = [int(x) for x in ids.split(",")]

# =========================
# DATA
# =========================
df = pd.read_csv(CHEMIN_CSV, low_memory=False)

# 🔥 ADAPTE ICI SI BESOIN
ID_COL = "id"
LAT_COL = "lat"
LON_COL = "long"

# sécurité colonnes
if ID_COL not in df.columns:
    print(json.dumps({"error": "id column not found"}))
    sys.exit()

df = df[df[ID_COL].isin(ids_list)].copy()

df[LAT_COL] = pd.to_numeric(df[LAT_COL], errors="coerce")
df[LON_COL] = pd.to_numeric(df[LON_COL], errors="coerce")

df = df.dropna(subset=[LAT_COL, LON_COL])

if df.empty:
    print(json.dumps([]))
    sys.exit()

# =========================
# MODEL (chargé une fois par exécution)
# =========================
model = joblib.load(CHEMIN_MODELE)

X = df[[LAT_COL, LON_COL]].values
clusters = model.predict(X)

# =========================
# OUTPUT
# =========================
result = []

for i in range(len(df)):
    result.append({
        "id": int(df.iloc[i][ID_COL]),
        "latitude": float(df.iloc[i][LAT_COL]),
        "longitude": float(df.iloc[i][LON_COL]),
        "cluster": int(clusters[i])
    })

print(json.dumps(result))