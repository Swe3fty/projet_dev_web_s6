# Envoie les fichiers SQL dans la base de l'ecole via phpMyAdmin (HTTP),
#   py scripts\import_simple.py
# Prerequis : pip install requests

import re
import requests

BASE = "http://projets.isen-ouest.info/phpmyadmin/"
USER = "mbourg28"
PASSWORD = "O3C4Kx_KJmvQc9yB"
DB = "mbourg28"

FICHIERS = [
    "projet_dev_web_s6/bornes_irve.sql",   # structure des tables
    "bornes_data.sql.gz",                  # donnees
]

session = requests.Session()


def token():
    page = session.get(BASE).text
    return re.search(r"[0-9a-f]{32}", page).group()


# Connexion
session.post(BASE, data={
    "pma_username": USER,
    "pma_password": PASSWORD,
    "server": "1",
    "target": "index.php",
    "token": token(),
})

# On envoie chaque fichier au formulaire d'import de phpMyAdmin.
jeton = token()
for fichier in FICHIERS:
    nom = fichier.split("/")[-1]
    with open(fichier, "rb") as f:
        reponse = session.post(
            BASE + "import.php",
            data={
                "db": DB,
                "token": jeton,
                "import_type": "database",
                "format": "sql",
                "charset_of_file": "utf-8",
            },
            files={"import_file": (nom, f)},
        )
    if "successfully finished" in reponse.text:
        print("OK   :", nom)
    else:
        print("ECHEC:", nom)
