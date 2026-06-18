<?php
  require_once('database.php');

  // Connexion à la base de données.
  $db = dbConnect();
  if (!$db) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['erreur' => 'Connexion a la base impossible']);
    exit;
  }

  // Analyse de la requête (méthode + ressource via PATH_INFO).
  $requestMethod    = $_SERVER['REQUEST_METHOD'];
  $request          = substr($_SERVER['PATH_INFO'] ?? '', 1);
  $request          = explode('/', $request);
  $requestRessource = array_shift($request);
  $subRessource     = array_shift($request);

  // Données envoyées par le client (POST/PUT).
  // On prend d'abord le format formulaire ($_POST) ; sinon on lit le corps JSON.
  $input = $_POST;
  if (empty($input)) {
    $input = json_decode(file_get_contents('php://input'), true);
  }
  if (!$input) {
    $input = [];
  }

  $data = false;
  $code = 200;

  //--- GET : lecture des données ---
  if ($requestMethod == 'GET') {

    if ($requestRessource == 'stations') {
      $data = getStations($db);
    }
    elseif ($requestRessource == 'points-charge') {
      $limit = null;
      if (isset($_GET['limit'])) {
        $limit = (int) $_GET['limit'];
      }
      $offset = 0;
      if (isset($_GET['offset'])) {
        $offset = (int) $_GET['offset'];
      }
      $data = getPointsCharge($db, $limit, $offset);
    }
    elseif ($requestRessource == 'communes' && $subRessource == 'departements') {
      $data = getDepartements($db);
    }
    elseif ($requestRessource == 'statistiques') {
      $departement = $_GET['departement'] ?? null;
      if ($departement == null) {
        $code = 400;
      } else {
        $data = getStatistiques($db, $departement);
      }
    }
  }

  //--- POST : création ---
  elseif ($requestMethod == 'POST') {

    if ($requestRessource == 'points-charge') {
      $data = addPointDeCharge($db, $input);
      if ($data !== false) {
        $code = 201;
      } else {
        $code = 500;
      }
    }
    elseif ($requestRessource == 'predictions') {
      $code = 501;
    }
  }

  //--- PUT : modification ---
  elseif ($requestMethod == 'PUT') {

    if ($requestRessource == 'points-charge') {
      $id = $_GET['id_pdc_itinerance'] ?? '';
      $data = updatePointDeCharge($db, $id, $input);
      if ($data === false) {
        $code = 500;
      }
    }
  }

  //--- DELETE : suppression ---
  elseif ($requestMethod == 'DELETE') {

    if ($requestRessource == 'points-charge') {
      $id = $_GET['id_pdc_itinerance'] ?? '';
      $data = deletePointDeCharge($db, $id);
      if ($data === false) {
        $code = 500;
      }
    }
  }

  // Réponse au client.
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-control: no-store, no-cache, must-revalidate');
  header('Pragma: no-cache');

  if ($data !== false) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
  }

  // Pas de données : si aucune route n'a correspondu, c'est une 404.
  if ($code == 200) {
    $code = 404;
  }
  http_response_code($code);
  echo json_encode(['erreur' => 'Requete invalide ou introuvable']);
?>