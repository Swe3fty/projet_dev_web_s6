<?php
// Affichage des erreurs pour le débug (tu peux le passer à 0 une fois en prod)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once('database.php');

$db = dbConnect();
if (!$db) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['erreur' => 'Connexion a la base impossible']);
    exit;
}

// Analyse de la requête
$requestMethod    = $_SERVER['REQUEST_METHOD'];
$request          = substr($_SERVER['PATH_INFO'] ?? '', 1);
$request          = explode('/', $request);
$requestRessource = array_shift($request);
$subRessource     = array_shift($request);

// Données entrantes
$input = $_POST;
if (empty($input)) {
    $input = json_decode(file_get_contents('php://input'), true);
}
if (!$input) {
    $input = [];
}

$data = false;
$code = 200;

// --- REQUÊTES GET ---
if ($requestMethod == 'GET') {
    if ($requestRessource == 'stations') {
        $data = getStations($db);
    } elseif ($requestRessource == 'points-charge') {
        if (isset($_GET['limit'])) {
            $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
            $data = getPointsChargePage($db, (int) $_GET['limit'], $offset);
        } else {
            $data = getPointsCharge($db);
        }
    } elseif ($requestRessource == 'communes' && $subRessource == 'departements') {
        $data = getDepartements($db);
    } elseif ($requestRessource == 'statistiques') {
        if (isset($_GET['departement'])) {
            $data = getStatistiques($db, $_GET['departement']);
        } else {
            $code = 400;
        }
    }
}

// --- REQUÊTES POST ---
elseif ($requestMethod == 'POST') {
    if ($requestRessource == 'points-charge') {
        $data = addPointDeCharge($db, $input);
        $code = ($data !== false) ? 201 : 500;
    } 
    // Bloc Prédiction (IA)
    elseif ($requestRessource == 'predictions' && $subRessource == 'implantation') {
        $id = $input['id'] ?? null;
        if (!$id) {
            $code = 400;
        } else {
            $pdcData = getPointChargeById($db, $id);
            if (!$pdcData) {
                $code = 404;
            } else {
                // Utilisation du dossier temporaire système pour éviter les problèmes de droits
                $tempDir = sys_get_temp_dir();
                $tempFilePath = $tempDir . DIRECTORY_SEPARATOR . 'temp_' . md5($id) . '.json';
                file_put_contents($tempFilePath, json_encode($pdcData, JSON_UNESCAPED_UNICODE));

                $scriptsDir = realpath(__DIR__ . '/../scripts');
                $pythonExe = "C:\\Users\\gaspa\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";
                $scriptPath = $scriptsDir . DIRECTORY_SEPARATOR . 'implantation.py';

                // Exécution de l'IA
                $command = '"' . $pythonExe . '" "' . $scriptPath . '" --file "' . $tempFilePath . '" 2>&1';
                $output = shell_exec($command);

                if (file_exists($tempFilePath)) {
                    unlink($tempFilePath);
                }

                $predictionResult = json_decode($output, true);
                if (!$predictionResult || (isset($predictionResult['status']) && $predictionResult['status'] == 'error')) {
                    $code = 500;
                    $data = ['erreur' => 'Erreur IA', 'details' => $output];
                } else {
                    $data = array_merge($pdcData, $predictionResult);
                }
            }
        }
    }
}

// --- REQUÊTES PUT ---
elseif ($requestMethod == 'PUT') {
    if ($requestRessource == 'points-charge') {
        $id = $_GET['id_pdc_itinerance'] ?? '';
        $data = updatePointDeCharge($db, $id, $input);
        if ($data === false) {
            $code = 500;
        }
    }
}

// --- REQUÊTES DELETE ---
elseif ($requestMethod == 'DELETE') {
    if ($requestRessource == 'points-charge') {
        $id = $_GET['id_pdc_itinerance'] ?? '';
        $data = deletePointDeCharge($db, $id);
        if ($data === false) {
            $code = 500;
        }
    }
}

// --- RÉPONSE AU CLIENT ---
header('Content-Type: application/json; charset=utf-8');
header('Cache-control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

if ($data !== false) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
} else {
    http_response_code($code == 200 ? 404 : $code);
    echo json_encode(['erreur' => 'Requete invalide']);
}
?>