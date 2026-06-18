<?php
require_once('database.php');

// =========================
// Connexion DB
// =========================
$db = dbConnect();

if (!$db) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["error" => "DB connection failed"]);
    exit;
}

// =========================
// REQUEST INFO
// =========================
$requestMethod = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

// PATH_INFO SAFE
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$pathInfo = trim($pathInfo, '/');
$parts = $pathInfo !== '' ? explode('/', $pathInfo) : [];

$requestRessource = $parts[0] ?? null;
$subRessource = $parts[1] ?? null;

// =========================
// INPUT (POST/PUT JSON ou form-data)
// =========================
$input = $_POST;
if (empty($input)) {
    $input = json_decode(file_get_contents("php://input"), true);
}
if (!$input) {
    $input = [];
}

// =========================
// INIT
// =========================
$data = false;
$code = 200;

// =======================================================
// GET ROUTES
// =======================================================
if ($requestMethod === 'GET') {

    if ($requestRessource === 'stations') {
        $data = getStations($db);
    }

    elseif ($requestRessource === 'points-charge') {

        if (isset($_GET['limit'])) {
            $limit = (int) $_GET['limit'];
            $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
            $data = getPointsChargePage($db, $limit, $offset);
        } else {
            $data = getPointsCharge($db);
        }
    }

    elseif ($requestRessource === 'communes' && $subRessource === 'departements') {
        $data = getDepartements($db);
    }

    elseif ($requestRessource === 'statistiques') {

        $departement = $_GET['departement'] ?? null;

        if (!$departement) {
            http_response_code(400);
            echo json_encode(["error" => "departement missing"]);
            exit;
        }

        $data = getStatistiques($db, $departement);
    }
}

// =======================================================
// POST ROUTES
// =======================================================
elseif ($requestMethod === 'POST') {

    // =========================
    // POINTS CHARGE
    // =========================
    if ($requestRessource === 'points-charge') {

        $data = addPointDeCharge($db, $input);

        if ($data !== false) {
            $code = 201;
        } else {
            $code = 500;
        }
    }

    // =========================
    // PREDICTION CLUSTERS (PYTHON)
    // =========================
    elseif ($action === 'predictions_clusters') {

        if (!isset($input['borne_ids']) || empty($input['borne_ids'])) {
            http_response_code(400);
            echo json_encode(["error" => "borne_ids manquant"]);
            exit;
        }

        $ids = array_map('intval', $input['borne_ids']);
        $idsString = implode(',', $ids);

        // IMPORTANT : chemin python (adapter si besoin)
        $python = "python3 ../python/predict_clusters.py " . $idsString;

        $output = shell_exec($python);

        if (!$output) {
            http_response_code(500);
            echo json_encode(["error" => "Python failed"]);
            exit;
        }

        header('Content-Type: application/json; charset=utf-8');
        echo $output;
        exit;
    }
}

// =======================================================
// PUT ROUTES
// =======================================================
elseif ($requestMethod === 'PUT') {

    if ($requestRessource === 'points-charge') {

        $id = $_GET['id_pdc_itinerance'] ?? null;
        $data = updatePointDeCharge($db, $id, $input);

        if ($data === false) {
            $code = 500;
        }
    }
}

// =======================================================
// DELETE ROUTES
// =======================================================
elseif ($requestMethod === 'DELETE') {

    if ($requestRessource === 'points-charge') {

        $id = $_GET['id_pdc_itinerance'] ?? null;
        $data = deletePointDeCharge($db, $id);

        if ($data === false) {
            $code = 500;
        }
    }
}

// =======================================================
// RESPONSE
// =======================================================
header('Content-Type: application/json; charset=utf-8');
header('Cache-control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

if ($data !== false) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code($code ?: 404);
echo json_encode(["error" => "Bad request"]);
exit;
?>