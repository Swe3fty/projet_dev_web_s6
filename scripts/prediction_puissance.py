# -*- coding: utf-8 -*-
import os
import pandas as pd
import joblib
import json
import argparse

DOSSIER = os.path.dirname(os.path.abspath(__file__))
CHEMIN_MODELE = os.path.join(DOSSIER, 'modele_puissance.pkl')

bool_features = ['prise_type_ef', 'prise_type_2', 'prise_type_combo_ccs',
                 'prise_type_chademo', 'prise_type_autre', 'gratuit', 'station_deux_roues']

# Chargement du modèle
try:
    modele = joblib.load(CHEMIN_MODELE)
except Exception as e:
    print(json.dumps({"status": "error", "message": f"Erreur chargement modèle: {str(e)}"}))
    exit(1)

def predire_puissance(borne):
    """Prend les caractéristiques d'une borne (dictionnaire ou liste) et renvoie sa prédiction."""
    
    # 1. On vérifie si PHP a déjà envoyé une liste pour éviter de faire une liste de liste
    if isinstance(borne, list):
        X_new = pd.DataFrame(borne)
    else:
        X_new = pd.DataFrame([borne])
    
    # Prétraitement des booléens pour correspondre au format d'entraînement
    for col in bool_features:
        if col in X_new.columns:
            X_new[col] = X_new[col].astype(str).str.lower().isin(['true', 'vrai', '1']).astype(int)
        else:
            # Valeur par défaut si la colonne est absente de la requête
            X_new[col] = 0 
            
    # 2. LA LIGNE MAGIQUE EST ICI : on force toutes les colonnes en texte juste avant de prédire
    X_new.columns = X_new.columns.astype(str)
            
    return modele.predict(X_new)[0]

if __name__ == '__main__':
    # Configuration pour matcher la commande PHP : --file "chemin/vers/temp.json"
    parser = argparse.ArgumentParser(description="Prédit la puissance d'une borne.")
    parser.add_argument('--file', type=str, help='Chemin vers un fichier JSON de bornes')
    args = parser.parse_args()

    if args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                borne_data = json.load(f)

            # Exécution de la prédiction
            prediction = predire_puissance(borne_data)

            # Formatage de la réponse en JSON pur
            # Note : Si le modèle devient un Regressor, tu pourras enlever le "str()"
            reponse = {
                "status": "success",
                "prediction_puissance": str(prediction) 
            }
            
            # Print unique qui sera intercepté par shell_exec() en PHP
            print(json.dumps(reponse, ensure_ascii=False))

        except Exception as e:
            # En cas de crash, on renvoie quand même un JSON au PHP
            print(json.dumps({"status": "error", "message": str(e)}))