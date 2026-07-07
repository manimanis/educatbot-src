<?php
/**
 * Routeur PHP principal pour EducatBot
 * 
 * Sert l'application SPA (dist/index.html) et redirige les requêtes API
 * vers le proxy PHP.
 * 
 * Utilisation :
 *   Placez ce fichier à la racine du projet.
 *   http://127.0.0.1/MesProjets/educatbot-src/
 */

// Désactiver l'affichage des erreurs en production
ini_set('display_errors', 0);

// Récupérer l'URI demandée
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);

// Enlever le préfixe du projet pour obtenir le chemin relatif
$basePath = '/MesProjets/educatbot-src';
$relativePath = str_replace($basePath, '', $path);
$relativePath = '/' . ltrim($relativePath, '/');

// === ROUTES API ===
// Si la requête commence par /server/proxy.php, on l'exécute directement
if (strpos($relativePath, '/server/proxy.php') === 0) {
    // Inclure le proxy PHP
    require __DIR__ . '/server/proxy.php';
    exit;
}

// === ROUTES STATIC FILES ===
// Si le fichier demandé existe dans dist/, le servir directement
$distFile = __DIR__ . '/dist' . $relativePath;
if ($relativePath !== '/' && file_exists($distFile) && !is_dir($distFile)) {
    // Déterminer le type MIME
    $extension = pathinfo($distFile, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'  => 'font/ttf',
        'eot'  => 'application/vnd.ms-fontobject',
        'webp' => 'image/webp',
    ];
    
    if (isset($mimeTypes[$extension])) {
        header('Content-Type: ' . $mimeTypes[$extension]);
    }
    
    readfile($distFile);
    exit;
}

// === SPA FALLBACK ===
// Pour toutes les autres routes, servir dist/index.html
// Cela permet au routeur Vue.js de gérer ses propres routes côté client
$indexFile = __DIR__ . '/dist/index.html';
if (file_exists($indexFile)) {
    // Cache busting avec des headers appropriés
    header('Content-Type: text/html; charset=utf-8');
    readfile($indexFile);
    exit;
}

// === FALLBACK ULTIME ===
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '<h1>404 - Page non trouvée</h1>';
echo '<p>Le dossier dist/ est peut-être vide. Lancez <code>npm run build</code> pour générer les fichiers.</p>';