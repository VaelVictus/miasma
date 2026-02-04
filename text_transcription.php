<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');

$folder = isset($_GET['miasma']) ? trim((string) $_GET['miasma']) : '';

if ($folder === '') {
    echo '<p class="text_transcription_placeholder">Select a miasma to check for text transcription.</p>';
    exit;
}

if (!preg_match('/^[a-zA-Z0-9_-]+$/', $folder)) {
    http_response_code(400);
    echo '<p class="text_transcription_error">Invalid miasma requested.</p>';
    exit;
}

$transcription_path = __DIR__ . DIRECTORY_SEPARATOR . 'object_data' . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . 'text_transcription';

if (!is_dir($transcription_path)) {
    echo '<p class="text_transcription_placeholder">No text transcription is currently available for this miasma.</p>';
    exit;
}

$allowed_exts = ['html', 'htm', 'php'];
$files = [];

try {
    $directory_iterator = new DirectoryIterator($transcription_path);
} catch (UnexpectedValueException $exception) {
    echo '<p class="text_transcription_placeholder">No text transcription is currently available for this miasma.</p>';
    exit;
}

foreach ($directory_iterator as $fileinfo) {
    if ($fileinfo->isDot() || !$fileinfo->isFile()) {
        continue;
    }

    $ext = strtolower($fileinfo->getExtension());
    if (!in_array($ext, $allowed_exts, true)) {
        continue;
    }

    $files[] = [
        'path' => $fileinfo->getPathname(),
        'filename' => $fileinfo->getFilename(),
        'ext' => $ext
    ];
}

usort($files, static function (array $a, array $b): int {
    return strcasecmp($a['filename'], $b['filename']);
});

if (!$files) {
    echo '<p class="text_transcription_placeholder">No text transcription is currently available for this miasma.</p>';
    exit;
}

ob_start();

$has_multiple = count($files) > 1;

foreach ($files as $index => $file) {
    if ($has_multiple) {
        if ($index > 0) {
            echo '<hr class="text_transcription_rule" />';
        }

        $display_name = pathinfo($file['filename'], PATHINFO_FILENAME);
        $display_name = str_replace('_', ' ', $display_name);
        echo '<h3 class="text_transcription_title">' . $display_name . '</h3>';
    }

    if ($file['ext'] === 'php') {
        ob_start();
        include_once $file['path'];
        $content = ob_get_clean();
        echo $content;
        continue;
    }

    $content = @file_get_contents($file['path']);
    if ($content === false) {
        echo '<p class="text_transcription_error">Failed to read transcription file.</p>';
        continue;
    }

    echo $content;
}

$output = ob_get_contents();
ob_end_clean();

// echo output after stripping all whitespace
echo preg_replace('/\s+/', ' ', (string) $output);

