<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$folder = isset($_GET['miasma']) ? trim((string) $_GET['miasma']) : '';

if ($folder === '') {
    echo json_encode(['files' => []]);
    exit;
}

if (!preg_match('/^[a-zA-Z0-9_-]+$/', $folder)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid miasma requested.']);
    exit;
}

$basePath = __DIR__ . DIRECTORY_SEPARATOR . 'object_data';
$audioDirectory = $basePath . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . 'audio';

if (!is_dir($audioDirectory)) {
    echo json_encode(['files' => []]);
    exit;
}

$files = [];

$directoryIterator = new DirectoryIterator($audioDirectory);
foreach ($directoryIterator as $fileinfo) {
    if ($fileinfo->isDot() || !$fileinfo->isFile()) {
        continue;
    }

    if (strcasecmp($fileinfo->getExtension(), 'mp3') !== 0) {
        continue;
    }

    $filename = $fileinfo->getFilename();
    $displayName = str_replace('_', ' ', pathinfo($filename, PATHINFO_FILENAME));
    $files[] = [
        'filename' => $filename,
        'displayName' => $displayName,
        'path' => 'object_data/' . $folder . '/audio/' . $filename
    ];
}

usort($files, static function (array $a, array $b): int {
    return strcasecmp($a['displayName'], $b['displayName']);
});

echo json_encode(['files' => $files]);
