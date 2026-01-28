<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$folder = isset($_GET['miasma']) ? trim((string) $_GET['miasma']) : '';

if ($folder === '') {
    echo json_encode(['count' => 0]);
    exit;
}

if (!preg_match('/^[a-zA-Z0-9_-]+$/', $folder)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid miasma requested.']);
    exit;
}

$basePath = __DIR__ . DIRECTORY_SEPARATOR . 'object_data';

function countAudioFiles(string $directory): int
{
    if (!is_dir($directory)) {
        return 0;
    }

    $count = 0;

    try {
        $directoryIterator = new DirectoryIterator($directory);
    } catch (UnexpectedValueException $exception) {
        return 0;
    }

    foreach ($directoryIterator as $fileinfo) {
        if ($fileinfo->isDot() || !$fileinfo->isFile()) {
            continue;
        }

        if (strcasecmp($fileinfo->getExtension(), 'mp3') !== 0) {
            continue;
        }

        $count++;
    }

    return $count;
}

$audioCount = countAudioFiles(
    $basePath . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . 'audio'
);

$sfxCount = countAudioFiles(
    $basePath . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . 'sfx'
);

$totalCount = $audioCount + $sfxCount;

echo json_encode(['count' => $totalCount]);
