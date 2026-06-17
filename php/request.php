<?php
  require_once('database.php');

  // Database connexion.
  $db = dbConnect();
  if (!$db) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
  }

  // Check the request.
  $requestMethod = $_SERVER['REQUEST_METHOD'];
  $request = substr($_SERVER['PATH_INFO'], 1);
  $request = explode('/', $request);
  $requestRessource = array_shift($request);
  $subRessource = array_shift($request);

    $data = false;

    if($requestMethod == 'GET'){
        if($requestRessource == 'stations'){
                $data = getStations($db);
        }
        if ($requestRessource == 'communes' && $subRessource == 'departements') {
                $data = getDepartements($db);
        }
        if ($requestRessource == "statistiques"){
            $departement = $_GET['departement'] ?? null;
            if ($departement == null){
                http_response_code(400);
            } else {
                $data = getStatistiques($db, $departement);
            }
        }
    }


  // Send data to the client.
  if ($data)
  {

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');

    if ($requestMethod == 'POST')
      header('HTTP/1.1 201 Created');
    else
      header('HTTP/1.1 200 OK');
      echo json_encode($data);
    exit;
  } 
  
  // Bad request case.
  header('HTTP/1.1 400 Bad Request');

?>