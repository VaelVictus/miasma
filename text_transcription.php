<?php
declare(strict_types=1);

function renderTextTranscription(string $folder): string
{
    if ($folder === '') {
        return '<p class="text_transcription_placeholder">Select a miasma to check for text transcription.</p>';
    }

    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $folder)) {
        http_response_code(400);
        return '<p class="text_transcription_error">Invalid miasma requested.</p>';
    }

    $transcription_path = __DIR__ . DIRECTORY_SEPARATOR . 'object_data' . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . 'text_transcription';

    if (!is_dir($transcription_path)) {
        return '<p class="text_transcription_placeholder">This item is a good candidate for transcription..</p>';
    }

    $allowed_exts = ['html', 'htm', 'php', 'txt'];
    $files = [];

    try {
        $directory_iterator = new DirectoryIterator($transcription_path);
    } catch (UnexpectedValueException $exception) {
        return '<p class="text_transcription_placeholder">This item is a good candidate for transcription..</p>';
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
        return '<p class="text_transcription_placeholder">This item is a good candidate for transcription..</p>';
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

        if ($file['ext'] === 'txt') {
            echo '<div class="text_transcription_text">' . nl2br($content, false) . '</div>';
            continue;
        }

        echo $content;
    }

    return (string)ob_get_clean();
}

header('Content-Type: text/html; charset=utf-8');

$folder = isset($_GET['miasma']) ? trim((string) $_GET['miasma']) : '';
echo renderTextTranscription($folder);
