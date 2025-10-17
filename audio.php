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
 * @param bool   $useOrderPrefix sort by leading numeric prefix and strip it from display name
 * @return array<int, array{filename: string, displayName: string, path: string}>
 */
function collectAudioFiles(string $directory, string $publicPathPrefix, bool $useOrderPrefix = false): array
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
        $baseName = pathinfo($filename, PATHINFO_FILENAME);

        $order = null;
        $displayBase = $baseName;

        // parse a leading numeric prefix like "12_..." and remove it from the display name
        if ($useOrderPrefix && preg_match('/^(\d+)_+(.*)$/', $baseName, $matches) === 1) {
            $order = (int) $matches[1];
            $displayBase = $matches[2];
        }

        $displayName = str_replace('_', ' ', $displayBase);

        $entry = [
            'filename' => $filename,
            'displayName' => $displayName,
            'path' => $publicPathPrefix . $filename
        ];

        if ($order !== null) {
            $entry['_order'] = $order; // internal sort key, removed before return
        }

        $files[] = $entry;
    }

    if ($useOrderPrefix) {
        usort($files, static function (array $a, array $b): int {
            $ao = array_key_exists('_order', $a) ? (int) $a['_order'] : PHP_INT_MAX;
            $bo = array_key_exists('_order', $b) ? (int) $b['_order'] : PHP_INT_MAX;
            if ($ao !== $bo) {
                return $ao <=> $bo;
            }
            return strcasecmp($a['displayName'], $b['displayName']);
        });

        // remove internal key before returning
        foreach ($files as &$file) {
            if (isset($file['_order'])) {
                unset($file['_order']);
            }
        }
        unset($file);
    } else {
        usort($files, static function (array $a, array $b): int {
            return strcasecmp($a['displayName'], $b['displayName']);
        });
    }

    return $files;
}

$audioFiles = collectAudioFiles(
    $basePath . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . 'audio',
    'object_data/' . $folder . '/audio/',
    true
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
