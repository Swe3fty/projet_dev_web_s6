# Genere bornes_data.sql (+ .gz) a partir de exportIA.csv, pour le schema
# normalise (8 tables). A lancer depuis le dossier du projet.
# Prerequis : pip install pandas

import gzip
import shutil
import pandas as pd

# --- Lecture des 10 000 premieres lignes du CSV ---
df = pd.read_csv(
    "exportIA.csv", sep=";", encoding="cp1252", na_values="NA", nrows=10000,
    dtype={"siren_amenageur": str, "code_insee_commune": str,
           "consolidated_code_postal": str},
    low_memory=False,
)
df = df.rename(columns={"consolidated_commune": "nom_commune",
                        "consolidated_code_postal": "code_postal"})

# --- Nettoyage ---
prises = ["prise_type_ef", "prise_type_2", "prise_type_combo_ccs",
          "prise_type_chademo", "prise_type_autre"]

bool_map = {"vrai": 1, "true": 1, "faux": 0, "false": 0}
for c in prises + ["gratuit", "paiement_cb"]:
    df[c] = df[c].astype(str).str.lower().map(bool_map)

df["date_mise_en_service"] = pd.to_datetime(
    df["date_mise_en_service"], format="%Y-%m-%d", errors="coerce").dt.date

coords = df["coordonneesXY"].str.strip("[]").str.split(",", expand=True)
df["long"] = pd.to_numeric(coords[0], errors="coerce")
df["lat"] = pd.to_numeric(coords[1], errors="coerce")

df = df.dropna(subset=["id_station_itinerance", "id_pdc_itinerance",
                       "code_insee_commune"])

# --- Les 8 tables ---
type_prise = pd.DataFrame(
    {"type_prise": ["EF", "Type 2", "Combo CCS", "CHAdeMO", "Autre"]})

enseigne = df[["nom_enseigne"]].dropna().drop_duplicates()

commune = (df[["code_insee_commune", "nom_commune", "code_postal"]]
           .drop_duplicates("code_insee_commune"))

amenageur = (df[["siren_amenageur", "nom_amenageur", "contact_amenageur"]]
             .dropna(subset=["siren_amenageur"]).drop_duplicates("siren_amenageur"))

operateur = (df[["nom_operateur", "contact_operateur", "telephone_operateur"]]
             .dropna().drop_duplicates().reset_index(drop=True))
operateur.insert(0, "id_operateur", operateur.index + 1)

station = df.drop_duplicates("id_station_itinerance").merge(
    operateur, how="left",
    on=["nom_operateur", "contact_operateur", "telephone_operateur"])
station = station[["id_station_itinerance", "nom_station", "implantation_station",
                   "adresse_station", "lat", "long", "siren_amenageur",
                   "id_operateur", "nom_enseigne", "code_insee_commune"]]

pdc = df.drop_duplicates("id_pdc_itinerance")
point_de_charge = pdc[["id_pdc_itinerance", "puissance_nominale", "gratuit",
                       "paiement_cb", "tarification", "condition_acces",
                       "accessibilite_pmr", "date_mise_en_service",
                       "id_station_itinerance"]]

propose = pdc[["id_pdc_itinerance"] + prises].melt(
    "id_pdc_itinerance", var_name="prise", value_name="present")
propose = propose[propose["present"] == 1]
propose["type_prise"] = propose["prise"].map(dict(zip(prises, type_prise["type_prise"])))
propose = propose[["type_prise", "id_pdc_itinerance"]]

tables = {
    "type_prise": type_prise, "enseigne": enseigne, "commune": commune,
    "amenageur": amenageur, "operateur": operateur, "station": station,
    "point_de_charge": point_de_charge, "propose": propose,
}


# --- Ecriture du fichier SQL ---
def valeur(v):
    if pd.isna(v):
        return "NULL"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "\\'") + "'"


with open("bornes_data.sql", "w", encoding="utf-8") as f:
    f.write("SET FOREIGN_KEY_CHECKS=0;\n")
    for table in tables:                       # on vide les tables d'abord
        f.write(f"DELETE FROM `{table}`;\n")
    for table, data in tables.items():         # puis une ligne INSERT par enregistrement
        colonnes = ", ".join("`" + c + "`" for c in data.columns)
        for ligne in data.itertuples(index=False):
            valeurs = ", ".join(valeur(v) for v in ligne)
            f.write(f"INSERT INTO `{table}` ({colonnes}) VALUES ({valeurs});\n")

# Version compressee pour l'import via phpMyAdmin
with open("bornes_data.sql", "rb") as src, gzip.open("bornes_data.sql.gz", "wb") as dst:
    shutil.copyfileobj(src, dst)

print("Fichiers bornes_data.sql et bornes_data.sql.gz crees.")
