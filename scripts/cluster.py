# -*- coding: utf-8 -*-
"""
Script de prediction des clusters IRVE.
Il est appele par PHP via : POST php/request.php/predictions/clusters/

Entree : fichier JSON contenant les points de charge avec latitude/longitude.
Sortie : JSON uniquement, exploitable par JavaScript.
"""

import argparse
import json
import os
import sys
import warnings

warnings.filterwarnings("ignore")


def to_float(value):
    """Convertit une valeur en float, sinon renvoie None."""
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def load_model():
    """Charge le modele KMeans place dans modeles_pkl/kmeans_bornes.pkl."""
    try:
        import joblib
    except Exception as exc:
        raise RuntimeError("La librairie joblib / sklearn est introuvable cote serveur.") from exc

    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.abspath(os.path.join(base_dir, "..", "modeles_pkl", "kmeans_bornes.pkl"))

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Modele introuvable : {model_path}")

    return joblib.load(model_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Chemin du fichier JSON temporaire")
    args = parser.parse_args()

    try:
        with open(args.file, "r", encoding="utf-8") as f:
            points = json.load(f)

        if not isinstance(points, list):
            raise ValueError("Le fichier JSON doit contenir une liste de points.")

        model = load_model()
        resultats = []

        for point in points:
            lat = to_float(point.get("latitude", point.get("lat")))
            lon = to_float(point.get("longitude", point.get("lon")))

            # On ignore les lignes sans coordonnees valides.
            if lat is None or lon is None:
                continue

            cluster = int(model.predict([[lat, lon]])[0])

            resultats.append({
                "id": point.get("id"),
                "station": point.get("station", ""),
                "commune": point.get("commune", ""),
                "operateur": point.get("operateur", ""),
                "puissance": to_float(point.get("puissance")),
                "latitude": lat,
                "longitude": lon,
                "cluster": cluster
            })

        print(json.dumps({
            "status": "success",
            "total": len(resultats),
            "points": resultats
        }, ensure_ascii=False))

    except Exception as exc:
        print(json.dumps({
            "status": "error",
            "message": str(exc)
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
