<?php
// Routeur de l'API du site (point d'entree unique).
// Lit la methode HTTP (GET/POST/PUT/DELETE) et l'URL, appelle la fonction de database.php
// correspondante, puis renvoie la reponse en JSON. Les predictions passent par des scripts Python.

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Sécurité mémoire
ini_set('memory_limit', '512M');

require_once('database.php');

$db = dbConnect();
if (!$db) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['erreur' => 'Connexion a la base impossible']);
    exit;
}

// Decoupage de l'URL : ressource principale (ex : stations) + sous-ressource (ex : departements).
$requestMethod    = $_SERVER['REQUEST_METHOD'];
$request          = substr($_SERVER['PATH_INFO'] ?? '', 1);
$request          = explode('/', $request);
$requestRessource = array_shift($request);
$subRessource     = array_shift($request);

// Donnees envoyees par le client : formulaire classique, sinon corps JSON.
$input = $_POST;
if (empty($input)) {
    $input = json_decode(file_get_contents('php://input'), true);
}
if (!$input) {
    $input = [];
}

$data = false;
$code = 200;

// --- GET ---
if ($requestMethod == 'GET') {
    if ($requestRessource == 'stations') {
        $data = getStations($db);
    } elseif ($requestRessource == 'points-charge') {
        if (isset($_GET['limit'])) {
            $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
            // Filtres optionnels du tableau (transmis par la page Visualisation).
            $filtres = [
                'commune'   => $_GET['commune']   ?? '',
                'operateur' => $_GET['operateur'] ?? '',
                'puissance' => $_GET['puissance'] ?? ''
            ];
            $data = getPointsChargePage($db, (int) $_GET['limit'], $offset, $filtres);
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

// --- POST ---
elseif ($requestMethod == 'POST') {
    if ($requestRessource == 'points-charge') {
        $data = addPointDeCharge($db, $input);
        $code = ($data !== false) ? 201 : 500;
    }

    // --- CLUSTERS ---
    elseif ($requestRessource == 'predictions' && $subRessource == 'clusters') {
        $points = getPointsForClusters($db);

        if ($points === false || empty($points)) {
            $code = 500;
            $data = ['erreur' => 'Impossible de récupérer les points pour les clusters'];
        } else {
            $tempDir = sys_get_temp_dir();
            $tempFilePath = $tempDir . DIRECTORY_SEPARATOR . 'clusters_' . uniqid() . '.json';

            file_put_contents($tempFilePath, json_encode($points, JSON_UNESCAPED_UNICODE));

            $scriptPath = realpath(__DIR__ . '/../scripts/cluster.py');

            if (!$scriptPath) {
                $code = 500;
                $data = ['erreur' => 'Script cluster.py introuvable'];
            } else {
                $pythonExe = 'python3';

                $command = $pythonExe . ' '
                    . escapeshellarg($scriptPath)
                    . ' --file '
                    . escapeshellarg($tempFilePath)
                    . ' 2>&1';

                $output = shell_exec($command);

                if (file_exists($tempFilePath)) {
                    unlink($tempFilePath);
                }

                $result = json_decode($output, true);

                if (!$result || (isset($result['status']) && $result['status'] === 'error')) {
                    $code = 500;
                    $data = [
                        'erreur' => 'Erreur IA clusters',
                        'details' => $output
                    ];
                } else {
                    $data = $result;
                }
            }
        }
    }

    // --- IMPLANTATION ---
    elseif ($requestRessource == 'predictions' && $subRessource == 'implantation') {
        $id = $input['id'] ?? null;

        if (!$id) {
            $code = 400;
        } else {
            $pdcData = getPointChargeById($db, $id);

            if (!$pdcData) {
                $code = 404;
            } else {
                $tempDir = sys_get_temp_dir();
                $tempFilePath = $tempDir . DIRECTORY_SEPARATOR . 'temp_' . md5($id) . '.json';
                file_put_contents($tempFilePath, json_encode($pdcData, JSON_UNESCAPED_UNICODE));

                $scriptsDir = realpath(__DIR__ . '/../scripts');
                $pythonExe = 'python3';
                $scriptPath = $scriptsDir . DIRECTORY_SEPARATOR . 'implantation.py';

                $command = $pythonExe . ' '
                    . escapeshellarg($scriptPath)
                    . ' --file '
                    . escapeshellarg($tempFilePath)
                    . ' 2>&1';

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
    // --- PUISSANCE ---
    elseif ($requestRessource == 'predictions' && $subRessource == 'puissance') {
        $id = $input['id'] ?? null;

        if (!$id) {
            $code = 400;
            $data = ['erreur' => 'ID du point de charge manquant'];
        } else {
            $pdcData = getPointChargeById($db, $id);

            if (!$pdcData) {
                $code = 404;
                $data = ['erreur' => 'Point de charge introuvable'];
            } else {
                $mappedData = [
                    'consolidated_latitude'  => $pdcData['lat'] ?? 0,
                    'consolidated_longitude' => $pdcData['lon'] ?? 0,
                    'condition_acces'        => $pdcData['acces'] ?? 'accès libre',
                    'nbre_pdc'               => $pdcData['nb_pdc'] ?? 1,
                    'implantation_station'   => $pdcData['implantation_station'] ?? 'Voirie'
                ];

                $tempDir = sys_get_temp_dir();
                $tempFilePath = $tempDir . DIRECTORY_SEPARATOR . 'temp_puissance_' . md5($id) . '.json';

                file_put_contents($tempFilePath, json_encode([$mappedData], JSON_UNESCAPED_UNICODE));

                $scriptsDir = realpath(__DIR__ . '/../scripts');
                $pythonExe = 'python3';
                $scriptPath = $scriptsDir . DIRECTORY_SEPARATOR . 'prediction_puissance.py';

                $command = $pythonExe . ' '
                    . escapeshellarg($scriptPath)
                    . ' --file '
                    . escapeshellarg($tempFilePath)
                    . ' 2>&1';

                $output = shell_exec($command);

                if (file_exists($tempFilePath)) {
                    unlink($tempFilePath);
                }

                $predictionResult = json_decode($output, true);

                if (!$predictionResult || (isset($predictionResult['status']) && $predictionResult['status'] == 'error')) {
                    $code = 500;
                    $data = [
                        'erreur' => 'Erreur de l IA puissance',
                        'details' => $output
                    ];
                } else {
                    $data = array_merge($pdcData, $predictionResult);
                }
            }
        }
    }
}

// --- PUT ---
elseif ($requestMethod == 'PUT') {
    if ($requestRessource == 'points-charge') {
        $id = $_GET['id_pdc_itinerance'] ?? '';
        $data = updatePointDeCharge($db, $id, $input);
        if ($data === false) {
            $code = 500;
        }
    }
}

// --- DELETE ---
elseif ($requestMethod == 'DELETE') {
    if ($requestRessource == 'points-charge') {
        $id = $_GET['id_pdc_itinerance'] ?? '';
        $data = deletePointDeCharge($db, $id);
        if ($data === false) {
            $code = 500;
        }
    }
}

// Reponse finale : on renvoie le resultat en JSON, ou une erreur si la requete a echoue.
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