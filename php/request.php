<?php
require_once('database.php');

$db = dbConnect();

if (!$db) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed"]);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$requestMethod = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$pathInfo = trim($pathInfo, '/');
$parts = $pathInfo ? explode('/', $pathInfo) : [];

$requestRessource = $parts[0] ?? null;
$subRessource = $parts[1] ?? null;

$input = $_POST;
if (empty($input)) {
    $input = json_decode(file_get_contents("php://input"), true) ?? [];
}

$data = false;
$code = 200;

// ===================== GET
if ($requestMethod === 'GET') {

    if ($requestRessource === 'stations') {
        $data = getStations($db);
    }

    elseif ($requestRessource === 'points-charge') {
        if (isset($_GET['limit'])) {
            $limit = (int)$_GET['limit'];
            $offset = (int)($_GET['offset'] ?? 0);
            $data = getPointsChargePage($db, $limit, $offset);
        } else {
            $data = getPointsCharge($db);
        }
    }

    elseif ($requestRessource === 'statistiques') {
        $dep = $_GET['departement'] ?? null;
        if (!$dep) {
            http_response_code(400);
            echo json_encode(["error" => "departement missing"]);
            exit;
        }
        $data = getStatistiques($db, $dep);
    }
}

// ===================== POST
elseif ($requestMethod === 'POST') {

    if ($requestRessource === 'points-charge') {
        $data = addPointDeCharge($db, $input);
        $code = $data ? 201 : 500;
    }

    elseif ($action === 'predictions_clusters') {

        if (!isset($input['borne_ids']) || empty($input['borne_ids'])) {
            http_response_code(400);
            echo json_encode(["error" => "borne_ids manquant"]);
            exit;
        }

        $ids = array_map('intval', $input['borne_ids']);
        $idsString = implode(',', $ids);

        $python = "python3 ../python/predict_clusters.py " . escapeshellarg($idsString);
        $output = shell_exec($python);

        if (!$output) {
            http_response_code(500);
            echo json_encode(["error" => "Python failed"]);
            exit;
        }

        echo $output;
        exit;
    }
}

// ===================== PUT
elseif ($requestMethod === 'PUT') {

    if ($requestRessource === 'points-charge') {
        $id = $_GET['id_pdc_itinerance'] ?? null;
        $data = updatePointDeCharge($db, $id, $input);
    }
}

// ===================== DELETE
elseif ($requestMethod === 'DELETE') {

    if ($requestRessource === 'points-charge') {
        $id = $_GET['id_pdc_itinerance'] ?? null;
        $data = deletePointDeCharge($db, $id);
    }
}

if ($data !== false) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

http_response_code(404);
echo json_encode(["error" => "Bad request"]);