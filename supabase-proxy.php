<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

$SUPABASE_URL = 'https://qwlghfwnfryxedlgipax.supabase.co';
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bGdoZnduZnJ5eGVkbGdpcGF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDg0NSwiZXhwIjoyMDczNTE2ODk1fQ.Y-_kig5inxxOVWX0YQu5KUMwhEIl78uDT5ty4y4jjQA';

$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';
$method = $_SERVER['REQUEST_METHOD'];

if (empty($endpoint)) {
    http_response_code(400);
    echo json_encode(['error' => 'Endpoint não especificado']);
    exit;
}

$url = rtrim($SUPABASE_URL, '/') . '/' . ltrim($endpoint, '/');

// Configuração da requisição cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $SUPABASE_KEY,
    'Authorization: Bearer ' . $SUPABASE_KEY,
    'Content-Type: application/json'
]);

// Configura o método da requisição
switch ($method) {
    case 'POST':
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
        break;
    case 'PUT':
    case 'DELETE':
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
        break;
}

// Executa a requisição
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

// Configura o cabeçalho de resposta
header('Content-Type: ' . $contentType);
http_response_code($httpCode);

// Retorna a resposta
if (curl_errno($ch)) {
    echo json_encode(['error' => curl_error($ch)]);
} else {
    echo $response;
}

curl_close($ch);
