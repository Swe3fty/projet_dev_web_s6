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
  // Récupération de toutes les stations
  function getStations($db) {
    try {
        $query = 'SELECT * FROM station';
        $stmt = $db->prepare($query);
        $stmt->execute();
    }


     catch (PDOException $exception) {
      error_log('Erreur SQL (stations)'.$exception->getMessage());
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

  function getStatistiques($db, $departement){
    $deptParam = $departement . '%'; //Ajout du % pour un like de la requête SQL
    // Left join pour inclure les stations sans points de charge 
    try {

        //Récupération des totaux pour le département
        $queryTotaux = 'SELECT
                COUNT(DISTINCT s.id_station_itinerance) AS nb_stations,
                COUNT(DISTINCT pdc.id_pdc_itinerance) AS nb_points_de_charge,
                AVG(pdc.puissance_nominale) AS puissance_moyenne,
                COUNT(DISTINCT s.id_operateur) AS nb_operateurs
            FROM station s
            INNER JOIN commune c ON s.code_insee_commune = c.code_insee_commune
            LEFT JOIN point_de_charge pdc ON pdc.id_station_itinerance = s.id_station_itinerance
            WHERE c.code_postal LIKE :departement';

        $stmt = $db->prepare($queryTotaux);
        $stmt->bindValue(':departement', $deptParam, PDO::PARAM_STR);
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






?>