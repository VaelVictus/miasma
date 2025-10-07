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

/**
 * @param string $directory
 * @param string $publicPathPrefix
 * @return array<int, array{filename: string, displayName: string, path: string}>
 */
function collectAudioFiles(string $directory, string $publicPathPrefix): array
{
    if (!is_dir($directory)) {
        return [];
    }

    $files = [];

    try {
        $directoryIterator = new DirectoryIterator($directory);
    } catch (UnexpectedValueException $exception) {
        return [];
    }

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
            'path' => $publicPathPrefix . $filename
        ];
    }

    usort($files, static function (array $a, array $b): int {
        return strcasecmp($a['displayName'], $b['displayName']);
    });

    return $files;
}

$audioFiles = collectAudioFiles(
    $basePath . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . 'audio',
    'object_data/' . $folder . '/audio/'
);

$sfxFiles = collectAudioFiles(
    $basePath . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . 'sfx',
    'object_data/' . $folder . '/sfx/'
);

$sections = [];

if ($audioFiles) {
    $sections[] = [
        'title' => 'Transcriptions',
        'files' => $audioFiles
    ];
}

if ($sfxFiles) {
    $sections[] = [
        'title' => 'Object Sounds',
        'files' => $sfxFiles
    ];
}

echo json_encode([
    'sections' => $sections,
    'files' => $audioFiles
]);
