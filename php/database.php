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
    
    try {
        $query = 'SELECT COUNT(*) AS nombre_stations, 
                         SUM(CASE WHEN puissance_max > 0 THEN 1 ELSE 0 END) AS nombre_stations_actives,
                         SUM(CASE WHEN puissance_max = 0 THEN 1 ELSE 0 END) AS nombre_stations_inactives
                  FROM station
                  WHERE code_postal LIKE :departement';
        $stmt = $db->prepare($query);
        $stmt->bindValue(':departement', $departement . '%', PDO::PARAM_STR);
        $stmt->execute();
    } catch (PDOException $exception) {
        error_log('Erreur SQL (Statistiques)'.$exception->getMessage());
        return false;
    }
    return $stmt->fetch(PDO::FETCH_ASSOC);
  }






?>