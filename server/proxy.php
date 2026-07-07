<?php
/**
 * Proxy PHP pour les API IA (compatible OpenAI)
 * 
 * Endpoints supportés (exemples) :
 *   - https://api.openai.com/v1/chat/completions
 *   - http://localhost:1234/v1/chat/completions (LM Studio)
 *   - https://api.groq.com/openai/v1/chat/completions
 *   - https://openrouter.ai/api/v1/chat/completions
 * 
 * Installation :
 *   Placez ce fichier dans le dossier de votre projet.
 *   Assurez-vous que PHP est installé et que allow_url_fopen est activé.
 * 
 * Utilisation :
 *   POST /server/proxy.php?action=chat
 *   POST /server/proxy.php?action=health
 */

// Configuration
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gérer les requêtes OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Lecture du body JSON
$rawBody = file_get_contents('php://input');
$request = json_decode($rawBody, true);

// Récupération de l'action
$action = $_GET['action'] ?? 'chat';

switch ($action) {
    case 'health':
        handleHealth();
        break;
    case 'chat':
    default:
        handleChat($request);
        break;
}

/**
 * Endpoint de santé
 */
function handleHealth() {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'ok',
        'timestamp' => date('c')
    ]);
    exit;
}

/**
 * Endpoint de proxy pour les requêtes IA
 */
function handleChat($request) {
    global $rawBody;

    // Valider les paramètres requis
    if (!$request || !isset($request['endpoint'])) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'API endpoint is required']);
        exit;
    }

    $endpoint = $request['endpoint'];
    $apiKey = $request['apiKey'] ?? '';
    $body = $request['body'] ?? [];

    // Vérifier si c'est une requête stream
    $isStream = !empty($body['stream']);

    if ($isStream) {
        proxyStreamRequest($endpoint, $apiKey, $body);
    } else {
        proxyNormalRequest($endpoint, $apiKey, $body);
    }
}

/**
 * Proxy une requête non-streaming
 */
function proxyNormalRequest($endpoint, $apiKey, $body) {
    $headers = [
        'Content-Type: application/json',
    ];
    if (!empty($apiKey)) {
        $headers[] = 'Authorization: Bearer ' . $apiKey;
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => json_encode($body),
            'timeout' => 60,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);

    $response = @file_get_contents($endpoint, false, $context);

    if ($response === false) {
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Proxy request failed',
            'message' => error_get_last()['message'] ?? 'Unable to reach endpoint'
        ]);
        exit;
    }

    // Récupérer les headers de la réponse
    $httpCode = 200;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (stripos($header, 'HTTP/') === 0) {
                $parts = explode(' ', $header);
                $httpCode = (int)($parts[1] ?? 200);
            }
            // Forward certains headers
            if (preg_match('/^Content-Type:/i', $header) || 
                preg_match('/^X-RateLimit-/i', $header) ||
                preg_match('/^openai-/i', $header) ||
                preg_match('/^x-request-id/i', $header) ||
                preg_match('/^x-kong-/i', $header)) {
                header($header);
            }
        }
    }

    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo $response;
    exit;
}

/**
 * Proxy une requête streaming (SSE)
 */
function proxyStreamRequest($endpoint, $apiKey, $body) {
    // Désactiver la mise en buffer de sortie pour le streaming
    @ini_set('output_buffering', 'off');
    @ini_set('zlib.output_compression', false);
    while (ob_get_level()) { ob_end_clean(); }

    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');

    $headers = [
        'Content-Type: application/json',
    ];
    if (!empty($apiKey)) {
        $headers[] = 'Authorization: Bearer ' . $apiKey;
    }

    $postData = json_encode($body);
    $headerStr = implode("\r\n", $headers);

    // Utilisation de curl pour le streaming (plus fiable que file_get_contents)
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $endpoint,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_WRITEFUNCTION => function ($ch, $data) {
            echo $data;
            ob_flush();
            flush();
            return strlen($data);
        }
    ]);

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($result === false && !empty($error)) {
        // En cas d'erreur, on envoie l'erreur via SSE
        echo "data: " . json_encode([
            'error' => 'Proxy request failed',
            'message' => $error
        ]) . "\n\n";
        echo "data: [DONE]\n\n";
        ob_flush();
        flush();
    }

    exit;
}