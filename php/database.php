<?php
  require_once('constantes.php');

  //----------------------------------------------------------------------------
  // Connexion à la base de données
  function dbConnect() {
    try {
        $db = new PDO('mysql:host='.DB_SERVER.';dbname='.DB_NAME.';charset=utf8;port='.DB_PORT, DB_USER, DB_PASSWORD);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $exception) {
        error_log('Connection error: '.$exception->getMessage());
        return false;
    }
    return $db;
  }


  //----------------------------------------------------------------------------
  // Récupération de toutes les stations (pour la carte)
  function getStations($db) {
    try {
        $query = 'SELECT s.id_station_itinerance AS id,
                         s.nom_station            AS nom,
                         c.nom_commune            AS commune,
                         c.code_postal            AS cp,
                         o.nom_operateur          AS operateur,
                         s.lat                    AS lat,
                         s.`long`                 AS lon,
                         MAX(p.puissance_nominale) AS puissance,
                         COUNT(p.id_pdc_itinerance) AS nb_pdc,
                         MAX(p.gratuit)            AS gratuit,
                         MAX(p.condition_acces)    AS acces,
                         MAX(p.accessibilite_pmr)  AS pmr
                  FROM station s
                  LEFT JOIN commune c   ON c.code_insee_commune = s.code_insee_commune
                  LEFT JOIN operateur o ON o.id_operateur       = s.id_operateur
                  LEFT JOIN point_de_charge p ON p.id_station_itinerance = s.id_station_itinerance
                  WHERE s.lat IS NOT NULL AND s.`long` IS NOT NULL
                  GROUP BY s.id_station_itinerance, s.nom_station, c.nom_commune,
                           c.code_postal, o.nom_operateur, s.lat, s.`long`';
        $stmt = $db->prepare($query);
        $stmt->execute();
    } catch (PDOException $exception) {
        error_log('Erreur SQL (stations)'.$exception->getMessage());
        return false;
    }
    $stations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Conversion des types pour le JSON (nombres, booléen).
    foreach ($stations as &$s) {
        $s['lat']       = (float) $s['lat'];
        $s['lon']       = (float) $s['lon'];
        $s['puissance'] = $s['puissance'] !== null ? (float) $s['puissance'] : null;
        $s['nb_pdc']    = (int) $s['nb_pdc'];
        $s['gratuit']   = (bool) $s['gratuit'];
    }
    return $stations;
  }


  //----------------------------------------------------------------------------
  // Récupération des points de charge (pour le tableau, avec pagination optionnelle)
  function getPointsCharge($db, $limit = null, $offset = 0) {
    try {
        $query = 'SELECT p.id_pdc_itinerance AS id, p.puissance_nominale AS puissance,
                         p.gratuit, p.paiement_cb, p.tarification,
                         p.condition_acces AS acces, p.accessibilite_pmr AS pmr,
                         p.date_mise_en_service AS date, p.id_station_itinerance AS id_station
                  FROM point_de_charge p
                  ORDER BY p.id_pdc_itinerance';
        if ($limit !== null) {
            $query .= ' LIMIT :limit OFFSET :offset';
        }
        $stmt = $db->prepare($query);
        if ($limit !== null) {
            $stmt->bindValue(':limit', (int) $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int) $offset, PDO::PARAM_INT);
        }
        $stmt->execute();
    } catch (PDOException $exception) {
        error_log('Erreur SQL (points-charge)'.$exception->getMessage());
        return false;
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }


  //----------------------------------------------------------------------------
  // Récupération de tous les départements
  function getDepartements($db){
    try {
        $query = 'SELECT DISTINCT LEFT(code_postal, 2) AS numero_departement
                  FROM commune
                  WHERE code_postal IS NOT NULL
                  ORDER BY numero_departement ASC';
        $stmt = $db->prepare($query);
        $stmt->execute();
    } catch (PDOException $exception) {
        error_log('Erreur SQL (Liste Départements)'.$exception->getMessage());
        return false;
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }


  //----------------------------------------------------------------------------
  // Statistiques des stations d'un département
  function getStatistiques($db, $departement){
    $deptParam = $departement . '%'; // pour le LIKE
    try {
        $query = 'SELECT COUNT(DISTINCT s.id_station_itinerance) AS nb_stations,
                         COUNT(p.id_pdc_itinerance)              AS nb_points_charge,
                         ROUND(AVG(p.puissance_nominale), 1)     AS puissance_moyenne,
                         COUNT(DISTINCT s.id_operateur)          AS nb_operateurs
                  FROM station s
                  JOIN commune c ON c.code_insee_commune = s.code_insee_commune
                  LEFT JOIN point_de_charge p ON p.id_station_itinerance = s.id_station_itinerance
                  WHERE LEFT(c.code_postal, 2) = :departement';
        $stmt = $db->prepare($query);
        $stmt->bindValue(':departement', $departement, PDO::PARAM_STR);
        $stmt->execute();
        $totaux = $stmt->fetch(PDO::FETCH_ASSOC);

        // Stations par type d'implantation pour département
        $queryImplantation = 'SELECT s.implantation_station, COUNT(DISTINCT s.id_station_itinerance) AS nb
            FROM station s
            INNER JOIN commune c ON s.code_insee_commune = c.code_insee_commune
            WHERE c.code_postal LIKE :departement
            GROUP BY s.implantation_station
            ORDER BY nb DESC';
        $stmt = $db->prepare($queryImplantation);
        $stmt->bindValue(':departement', $deptParam);
        $stmt->execute();
        $parImplantation = $stmt->fetchAll(PDO::FETCH_ASSOC);


        // Répartitions des puissances pour département
        $queryPuissances = "SELECT
        CASE
            WHEN pdc.puissance_nominale <= 7.4 THEN '≤ 7,4 kW'
            WHEN pdc.puissance_nominale <= 22 THEN '7,4-22 kW'
            WHEN pdc.puissance_nominale <= 50 THEN '22-50 kW'
            WHEN pdc.puissance_nominale <= 150 THEN '50-150 kW'
            ELSE '> 150 kW'
        END AS tranche,
        COUNT(*) AS nb
        FROM point_de_charge pdc
        INNER JOIN station s ON pdc.id_station_itinerance = s.id_station_itinerance
        INNER JOIN commune c ON s.code_insee_commune = c.code_insee_commune
        WHERE c.code_postal LIKE :departement
        GROUP BY tranche";

        $stmt = $db->prepare($queryPuissances);
        $stmt->bindValue(':departement', $deptParam);
        $stmt->execute();
        $repartitionPuissances = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Top 5 opérateurs
        $queryTopOperateurs = "
            SELECT o.nom_operateur, COUNT(DISTINCT s.id_station_itinerance) AS nb
            FROM operateur o
            INNER JOIN station s ON s.id_operateur = o.id_operateur
            INNER JOIN commune c ON s.code_insee_commune = c.code_insee_commune
            WHERE c.code_postal LIKE :departement
            GROUP BY o.nom_operateur
            ORDER BY nb DESC
            LIMIT 5
        ";
        $stmt = $db->prepare($queryTopOperateurs);
        $stmt->bindValue(':departement', $deptParam);
        $stmt->execute();
        $topOperateurs = $stmt->fetchAll(PDO::FETCH_ASSOC);


    } catch (PDOException $exception) {
        error_log('Erreur SQL (Statistiques)'.$exception->getMessage());
        return false;
    }
    return [
        'totaux' => $totaux,
        'par_implantation' => $parImplantation,
        'repartition_puissances' => $repartitionPuissances,
        'top_operateurs' => $topOperateurs
    ];
  }


  //----------------------------------------------------------------------------
  // Ajout d'une borne (commune + opérateur + station + point de charge)
  function addPointDeCharge($db, $data){
    try {
        $db->beginTransaction();

        // commune
        $codeCommune = 'U' . substr(md5(($data['commune'] ?? '') . microtime()), 0, 9);
        $db->prepare('INSERT INTO commune (code_insee_commune, nom_commune) VALUES (?, ?)')
           ->execute([$codeCommune, $data['commune'] ?? null]);

        // opérateur
        $idOperateur = null;
        if (!empty($data['operateur'])) {
            $db->prepare('INSERT INTO operateur (nom_operateur) VALUES (?)')
               ->execute([$data['operateur']]);
            $idOperateur = $db->lastInsertId();
        }

        // station
        $idStation = 'USR' . substr(md5(microtime()), 0, 12);
        $db->prepare('INSERT INTO station (id_station_itinerance, nom_station, lat, `long`, id_operateur, code_insee_commune)
                      VALUES (?, ?, ?, ?, ?, ?)')
           ->execute([$idStation, $data['nom'] ?? null, $data['lat'] ?? null,
                      $data['lon'] ?? null, $idOperateur, $codeCommune]);

        // point de charge
        $idPdc = 'USRP' . substr(md5(microtime()), 0, 12);
        $db->prepare('INSERT INTO point_de_charge (id_pdc_itinerance, puissance_nominale, gratuit, condition_acces, id_station_itinerance)
                      VALUES (?, ?, ?, ?, ?)')
           ->execute([$idPdc, $data['puissance'] ?? null,
                      !empty($data['gratuit']) ? 1 : 0, $data['acces'] ?? null, $idStation]);

        $db->commit();
    } catch (PDOException $exception) {
        $db->rollBack();
        error_log('Erreur SQL (ajout point de charge)'.$exception->getMessage());
        return false;
    }
    return ['ok' => true, 'id_station' => $idStation, 'id_pdc' => $idPdc];
  }


  //----------------------------------------------------------------------------
  // Modification d'un point de charge
  function updatePointDeCharge($db, $id, $data){
    try {
        $query = 'UPDATE point_de_charge
                  SET puissance_nominale = ?, tarification = ?, condition_acces = ?,
                      accessibilite_pmr = ?, gratuit = ?
                  WHERE id_pdc_itinerance = ?';
        $stmt = $db->prepare($query);
        $stmt->execute([$data['puissance'] ?? null, $data['tarification'] ?? null,
                        $data['acces'] ?? null, $data['pmr'] ?? null,
                        !empty($data['gratuit']) ? 1 : 0, $id]);
    } catch (PDOException $exception) {
        error_log('Erreur SQL (modif point de charge)'.$exception->getMessage());
        return false;
    }
    return ['ok' => true];
  }


  //----------------------------------------------------------------------------
  // Suppression d'un point de charge
  function deletePointDeCharge($db, $id){
    try {
        $db->prepare('DELETE FROM propose WHERE id_pdc_itinerance = ?')->execute([$id]);
        $db->prepare('DELETE FROM point_de_charge WHERE id_pdc_itinerance = ?')->execute([$id]);
    } catch (PDOException $exception) {
        error_log('Erreur SQL (suppression point de charge)'.$exception->getMessage());
        return false;
    }
    return ['ok' => true];
  }


