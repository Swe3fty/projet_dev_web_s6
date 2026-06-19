# Récapitulatif du projet — BORNEO

Projet de Développement Web réalisé au **Semestre 6 à l'Isen Brest**.
Auteurs : **Maelenn Piat · Gaspard Vieujean · Manech Bourgeois** — © 2026.

---

## 1. Présentation

**BORNEO** est une plateforme d'analyse des **bornes de recharge pour véhicules électriques** en France
(données IRVE — *Infrastructure de Recharge pour Véhicules Électriques*).

Le site permet de :

- **visualiser** les bornes sur une carte interactive (avec filtres, ajout, modification, suppression) ;
- consulter des **statistiques** par département (chiffres clés + graphiques) ;
- lancer des **prédictions** grâce à des modèles d'intelligence artificielle :
  - regroupement des bornes en **clusters** (KMeans),
  - prédiction du **type d'implantation** d'une borne (Random Forest),
  - prédiction de la **puissance** recommandée d'une borne.

---

## 2. Architecture générale

```
   Navigateur (HTML / CSS / JavaScript)
              │  appels fetch (JSON)
              ▼
   API PHP  (php/request.php)  ──►  Base de données MySQL
              │
              │  pour les prédictions
              ▼
   Scripts Python (scripts/*.py) + modèles .pkl
```

- **Front-end** : pages HTML, style avec Bootstrap + CSS maison, logique en JavaScript.
- **Back-end** : une API PHP qui sert de point d'entrée unique et dialogue avec la base.
- **Base de données** : MySQL, 8 tables (schéma normalisé).
- **IA** : scripts Python appelés par le PHP, qui chargent des modèles pré-entraînés (`.pkl`).

---

## 3. Structure des fichiers

### Pages HTML (front-end)
| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil (présentation du site). |
| `visualisation.html` | Carte des bornes + filtres + tableau + ajout/édition. |
| `statistiques.html` | Chiffres clés et graphiques par département. |
| `cluster.html` | Carte des bornes colorées par cluster (KMeans). |
| `prediction.html` | Prédiction du type d'implantation (Random Forest). |
| `puissance.html` | Prédiction de la puissance d'une borne. |

### Styles CSS
| Fichier | Rôle |
|---|---|
| `style.css` | Style commun (base, navbar, logo, footer, responsive). |
| `visualisation.css` | Style propre à la carte, aux filtres et au tableau. |
| `prediction.css` | Style des pages de prédiction. |

### Scripts JavaScript (`js/`)
| Fichier | Rôle |
|---|---|
| `visualisation.js` | Carte Leaflet, filtres, tableau paginé, ajout/édition/suppression. |
| `statistiques.js` | Liste des départements + graphiques (Chart.js). |
| `departements.js` | Variante de remplissage de la liste des départements. |
| `cluster.js` | Affichage des clusters sur la carte. |
| `prediction_implantation.js` | Appel et affichage de la prédiction d'implantation. |
| `puissance.js` | Appel et affichage de la prédiction de puissance. |
| `station.js` | Petit script de test (récupération des départements). |

### Back-end PHP (`php/`)
| Fichier | Rôle |
|---|---|
| `request.php` | **Routeur de l'API** : reçoit les requêtes et renvoie du JSON. |
| `database.php` | Toutes les fonctions d'accès à la base (SQL). |
| `constantes.php` | Identifiants de connexion à la base de données. |

### Intelligence artificielle (`scripts/`)
| Fichier | Rôle |
|---|---|
| `cluster.py` | Prédit le cluster d'un point (modèle KMeans). |
| `implantation.py` | Prédit le type d'implantation (Random Forest). |
| `prediction_puissance.py` | Prédit la catégorie de puissance. |
| `*.pkl`, `*.zip` | Modèles entraînés et fichiers de prétraitement. |

### Base de données (`BDD/` et `scripts_bdd/`)
| Fichier | Rôle |
|---|---|
| `BDD/bornes_irve.sql` | Création des 8 tables (structure). |
| `BDD/bornes_irve.mcd` | Modèle conceptuel de données. |
| `scripts_bdd/export_sql.py` | Génère le fichier de données SQL depuis le CSV source. |
| `scripts_bdd/import.py` | Envoie les fichiers SQL à phpMyAdmin. |
| `scripts_bdd/bornes_data.sql(.gz)` | Données à importer. |

---

## 4. Base de données (8 tables)

| Table | Contenu |
|---|---|
| `commune` | Communes (code INSEE, nom, code postal). |
| `operateur` | Opérateurs des bornes. |
| `amenageur` | Aménageurs (entité qui installe les bornes). |
| `enseigne` | Enseignes. |
| `type_prise` | Types de prise (EF, Type 2, Combo CCS, CHAdeMO, Autre). |
| `station` | Stations de recharge (position, opérateur, commune…). |
| `point_de_charge` | Points de charge d'une station (puissance, accès, tarif…). |
| `propose` | Lien entre un point de charge et les types de prise proposés. |

---

## 5. L'API (php/request.php)

L'API est de style REST : on appelle une **ressource** dans l'URL, avec une **méthode HTTP**.

| Méthode | URL | Action |
|---|---|---|
| `GET` | `/stations/` | Toutes les stations (pour la carte). |
| `GET` | `/points-charge/?limit=&offset=` | Une page de points de charge (tableau). |
| `GET` | `/communes/departements` | Liste des départements. |
| `GET` | `/statistiques/?departement=XX` | Statistiques d'un département. |
| `POST` | `/points-charge/` | Ajouter une borne. |
| `PUT` | `/points-charge/?id_pdc_itinerance=` | Modifier un point de charge. |
| `DELETE` | `/points-charge/?id_pdc_itinerance=` | Supprimer un point de charge. |
| `POST` | `/predictions/clusters/` | Prédiction des clusters (KMeans). |
| `POST` | `/predictions/implantation/` | Prédiction d'implantation (Random Forest). |
| `POST` | `/predictions/puissance/` | Prédiction de la puissance. |

Pour les prédictions, le PHP écrit les données dans un fichier JSON temporaire, exécute le script
Python correspondant, récupère sa sortie JSON, puis la renvoie au navigateur.

---

## 6. Comment ça fonctionne (prédictions)

1. L'utilisateur sélectionne une borne dans le tableau (page Visualisation).
2. Il clique sur « Prédire l'implantation » ou « Prédire la puissance ».
3. Le JavaScript envoie l'ID de la borne à l'API PHP.
4. Le PHP récupère les caractéristiques de la borne en base, puis appelle le script Python.
5. Le script Python charge son modèle `.pkl` et renvoie une prédiction en JSON.
6. Le JavaScript affiche le résultat sur la page.

---

## 7. Technologies utilisées

- **HTML5 / CSS3**, **Bootstrap 5**, police *Montserrat*, icônes *Font Awesome*.
- **JavaScript** (fetch), **Leaflet** (cartes), **Chart.js** (graphiques).
- **PHP** (PDO) pour l'API.
- **MySQL** pour la base de données.
- **Python** (pandas, scikit-learn / joblib) pour les modèles d'IA.

---

## 8. Mise en route (résumé)

1. Créer la base avec `BDD/bornes_irve.sql`, puis importer les données (`scripts_bdd/`).
2. Renseigner les identifiants de connexion dans `php/constantes.php`.
3. Servir le projet avec un serveur PHP (les pages appellent `php/request.php`).
4. Pour les prédictions : Python doit être disponible côté serveur, avec les modèles `.pkl`.

> Sans serveur PHP, la page de visualisation bascule sur des données locales (mode dégradé).

---

## 9. Documents du projet (`rendus_pdf/`)

Gantt, maquette, MCD, charte graphique et interface back/front sont fournis au format PDF.
