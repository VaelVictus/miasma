<?
    // Miasma
    $folders = [
        'ABOARD_VESSEL_(IBERIAN)_SAMPLE::25pps' => 'player',
        'A Peripheral Bestiary' => 'bestiary',
        'Bindlestiff' => 'bindlestiff',
        'Dear Rosetto' => 'rosetto',
        'His Latitude, The Stars: Notes For A Mural' => 'hislatitude',
        'Incineration Order [Incinerated Misc. K97]' => 'incineration',
        'Jenny Garganta' => 'jenny',
        'Loss Of Potential D57' => 'potential',
        'Macrophile' => 'macrophile',
        'No Ingress K29' => 'gates',
        'Some Guttering' => 'guttering',
        'The Abbieannia Problem' => 'weevilhunt1',
        'The Bowspirit' => 'frontispiece',
        'The Cambium' => 'cambium',
        'The Cambium (Alternate)' => 'cambium2',
        'The Diplomat' => 'diplomat',
        'The Dunnage Label' => 'address',
        'The Fretgay' => 'fretgay',
        'The Pageant Weevil' => 'weevil',
        'The Pilot\'s Book Fragment K894' => 'pilot2',
        'The Pilot\'s Book K23' => 'pilot',
        'The Roasting Dance' => 'weevilhunt2',
        'The River Upstairs' => 'riverupstairs',
        'The Semestress' => 'semestress',
        'The Tight Walk P8923' => 'tightwalk',
        'The Vase And The Cup K20' => 'vaseandcup',
        'The Wayle Map' => 'waylemap',
        'The Wayle Map (Alternate)' => 'waylemap2',
        'The Weevil Hunt' => 'weevilhunt3',
        'The Worst Cook [Transcript M12]' => 'worstcook',
        'Up Amongst A Pervert\'s Limbs' => 'pervertslimbs',
        'Vignettes On A Disaster, Apparently Not In My Honour' => 'vignettes',
        'Your Great Work' => 'yourgreatwork'
    ];

    $folder_labels = array_flip($folders);

    function resolvePreloadedMiasma($folders) {
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $path = is_string($path) ? trim($path, '/') : '';

        if ($path !== '') {
            $segments = explode('/', $path);
            if (count($segments) >= 2 && $segments[0] === 'miasma') {
                $candidate = $segments[1];
                if (in_array($candidate, $folders, true)) {
                    return $candidate;
                }
            }
        }

        if (isset($_GET['miasma']) && in_array($_GET['miasma'], $folders, true)) {
            return $_GET['miasma'];
        }

        return '';
    }

    function renderEndpointMarkup($endpoint_file, $miasma) {
        if (empty($miasma)) {
            return '';
        }

        $endpoint_path = __DIR__ . DIRECTORY_SEPARATOR . $endpoint_file;
        if (!file_exists($endpoint_path)) {
            return '';
        }

        $original_get = $_GET;
        $_GET['miasma'] = $miasma;

        ob_start();
        include $endpoint_path;
        $output = ob_get_clean();

        $_GET = $original_get;

        return (string)$output;
    }

    $preloaded_miasma = resolvePreloadedMiasma($folders);
    $preloaded_notes = renderEndpointMarkup('trottering_notes.php', $preloaded_miasma);
    $preloaded_transcription = renderEndpointMarkup('text_transcription.php', $preloaded_miasma);

    $variety_groups = [
        'cambium' => ['group' => 'cambium', 'order' => 0],
        'cambium2' => ['group' => 'cambium', 'order' => 1],
        'waylemap' => ['group' => 'waylemap', 'order' => 0],
        'waylemap2' => ['group' => 'waylemap', 'order' => 1]
    ];

    // download name prefixes for audio files - maps folder name to download prefix
    // based on option text, ignoring brackets and converting to snake_case
    $download_name_prefixes = [
        'player' => 'aboard_vessel_iberian_sample',
        'bestiary' => 'a_peripheral_bestiary',
        'bindlestiff' => 'bindlestiff',
        'rosetto' => 'dear_rosetto',
        'hislatitude' => 'his_latitude_the_stars',
        'incineration' => 'incineration_order',
        'jenny' => 'jenny_garganta',
        'potential' => 'loss_of_potential',
        'macrophile' => 'macrophile',
        'gates' => 'no_ingress',
        'guttering' => 'some_guttering',
        'weevilhunt1' => 'the_abbieannia_problem',
        'frontispiece' => 'the_bowspirit',
        'cambium' => 'the_cambium',
        'cambium2' => 'the_cambium_alternate',
        'diplomat' => 'the_diplomat',
        'address' => 'the_dunnage_label',
        'fretgay' => 'the_fretgay',
        'weevil' => 'the_pageant_weevil',
        'pilot2' => 'the_pilots_book_fragment',
        'pilot' => 'the_pilots_book',
        'weevilhunt2' => 'the_roasting_dance',
        'riverupstairs' => 'the_river_upstairs',
        'semestress' => 'the_semestress',
        'tightwalk' => 'the_tight_walk',
        'vaseandcup' => 'the_vase_and_the_cup',
        'waylemap' => 'the_wayle_map',
        'waylemap2' => 'the_wayle_map_alternate',
        'weevilhunt3' => 'the_weevil_hunt',
        'worstcook' => 'the_worst_cook',
        'pervertslimbs' => 'up_amongst_a_perverts_limbs',
        'vignettes' => 'vignettes_on_a_disaster',
        'yourgreatwork' => 'your_great_work'
    ];

    function generateOptions($folders) {
        global $preloaded_miasma;
        
        $html = "";
        
        foreach ($folders as $name => $folder) {
            // skip alternate versions in dropdown
            if (in_array($folder, ['cambium2', 'waylemap2'])) {
                continue;
            }
            
            $selected = ($folder == $preloaded_miasma) ? 'selected' : '';
            $html .= '<option value="' . $folder . '" ' . $selected . '>' . $name . '</option>' . PHP_EOL;
        }
    
        return $html;
    }

    ob_start();
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="./compiled/index.css?m=<?=time()?>" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="./compiled/magnify.min.css" />
        <meta name="viewport" content="width=device-width,height=device-height, initial-scale=1" />
        <title>Miasma Viewer | Black Crown: Exhumed</title>
        <meta name="description" content="Browse Black Crown: Exhumed miasma specimens with zoomable imagery, notes, and audio." />

        <link rel="apple-touch-icon" sizes="180x180" href="./favicons/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="./favicons/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="./favicons/favicon-16x16.png">
        <link rel="manifest" href="./favicons/site.webmanifest">
        <link rel="mask-icon" href="./favicons/safari-pinned-tab.svg" color="#5bbad5">

        <meta property="og:locale" content="en_US" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Miasma Viewer - Black Crown: Exhumed" />
        <meta property="og:description" content="Object viewer for the browser-based horror game Black Crown: Exhumed" />
        <meta property="og:url" content="https://blackcrownexhumed.com/miasma_viewer" />
        <meta property="og:site_name" content="Miasma Viewer" />

        <script src="./compiled/jquery-2.2.4.min.js" defer></script>
        <script src="./compiled/jquery.magnify.min.js" defer></script>
    </head>
    <body data-current-miasma="<?=$preloaded_miasma?>">
        <section id='miasma_selector'>
            <label for="folderSelect" class="sr-only">Choose a miasma specimen</label>
            <select id="folderSelect" onchange="changeFolder(this.value)">
                <option value="">Select a Specimen</option>
                <?=generateOptions($folders)?>
            </select>

            <nav id="miasma_crawl_links" class="sr-only" aria-label="Miasma specimen pages">
                <ul>
                    <? foreach ($folders as $name => $folder) { ?>
                        <li><a href="<?= '/index.php?miasma=' . rawurlencode($folder) ?>"><?=htmlspecialchars($name, ENT_QUOTES)?></a></li>
                    <? } ?>
                </ul>
            </nav>
        </section>

        <section id="choose_miasma" style='<?=(!empty($preloaded_miasma)) ? 'display: none;' : '' ?>'>
            <h2 align='center'><span class='bc_red'>\\\\</span> Clerk! <span class='bc_red'>////</span></h2>
            
            <p>Upon selection of a specimen, the miasma will be laid bare.</p>
            <p>Navigate the miasma by clicking the next and previous image previews.</p>
            <p>You may also use your keyboard's arrow keys, as your digits allow.</p>

            <div style='margin-top: 25px;'>
                <a href='https://blackcrownexhumed.com'>
                    <button class='btn'>Return to the Game</button>
                </a>
            </div>
        </section>

        <div id="variety_switcher" style="display: none;">
            <button class="btn" id="switch_variety">Switch Variety</button>
        </div>

        <div id="desktop_layout">
        <section id="slider_container" style='<?=(!empty($preloaded_miasma)) ? 'display: block;' : 'display: none;' ?>'>
            <div class="preview_row">
                <div class="desktop_cell preview_cell">
                    <div class="thumbnail thumbnail_slider" id="prevSlide"> </div>
                </div>

                <div class="desktop_cell preview_cell">
                    <div class="thumbnail2 thumbnail_slider" id="nextSlide"> </div>
                </div>
            </div>

            <div class="desktop_cell main_cell">
            <div class="slider"  id="main_slider">
                <?
                    foreach ($folders as $folder) {
                        $path = "object_data/$folder/images";
                        $files = scandir($path);

                        foreach ($files as $file) {
                            if (!in_array($file, ['.', '..']) && preg_match('/\.(jpg|jpeg|png|gif)$/i', $file)) {
                                $slide_name = pathinfo($file, PATHINFO_FILENAME); ?>
                                <?
                                    $variety_attributes = '';
                                    if (isset($variety_groups[$folder])) {
                                        $group = $variety_groups[$folder]['group'];
                                        $order = $variety_groups[$folder]['order'];
                                        $label = $folder_labels[$folder] ?? $folder;
                                        $variety_attributes = sprintf(
                                            " data-variety-group='%s' data-variety-order='%s' data-display-name='%s'",
                                            htmlspecialchars($group, ENT_QUOTES),
                                            htmlspecialchars((string)$order, ENT_QUOTES),
                                            htmlspecialchars($label, ENT_QUOTES)
                                        );
                                    }
                                ?>
                                <div class="slider-item all <?=$folder?>" data-folder='<?=$folder?>'<?=$variety_attributes?>>
                                    <img src="<?="{$path}/{$file}"?>" data-slide="<?="{$folder}_{$slide_name}"?>" loading='lazy' class="zoom" data-magnify-src="<?="{$path}/{$file}"?>" />
                                </div>
                        <?  }
                        }
                    }
                ?>
            </div>
            </div>
        </section>

        <section id="mobile_view" style='display: none;'>
            <div id='mobile_grid'>
                <div class="prev_button" id="prev_button"></div>
                <div class="next_button" id="next_button"></div>
            </div>
        </section>

        <div id="notes" style='<?=(!empty($preloaded_miasma)) ? '' : 'display: none;' ?>'>
            <h2>Trottering Notes</h2>
            
            <div class="tabs">
                <button class="tablinks active" onclick="openTab(event, 'game_notes');" id="game_notes_tab" role="tab">Widsith</button>
                <button class="tablinks" onclick="openTab(event, 'audio_notes');" id="audio_notes_tab" role="tab">Audio</button>
                <button class="tablinks" onclick="openTab(event, 'text_transcription');" id="text_transcription_tab" role="tab">Text Transcription</button>
                <button class="tablinks" onclick="openTab(event, 'player_notes');" id="player_notes_tab" role="tab">Clerk Notes</button>
            </div>

            <div id="game_notes" class="tabcontent active">
                <div id="game_notes_container">
                    <? if (!empty($preloaded_miasma)) {
                        echo $preloaded_notes;
                    } else { ?>
                        <p class="notes-placeholder" id="notes_placeholder">Select a miasma to load notes.</p>
                    <? } ?>
                </div>
            </div>

            <div id="audio_notes" class="tabcontent">
                <div id="audio_container" class="audio-panel" role="list">
                    <p class="audio-placeholder" id="audio_placeholder">Select a miasma to check for audio or sounds.</p>
                </div>
            </div>

            <div id="player_notes" class="tabcontent">
                <? # Player-related notes go here. ?>
                Future development will see the addition of player-submitted trottering notes.
            </div>

            <div id="text_transcription" class="tabcontent">
                <div id="text_transcription_container" class="text_transcription_panel">
                    <? if (!empty($preloaded_miasma)) {
                        echo $preloaded_transcription;
                    } else { ?>
                        <p class="text_transcription_placeholder" id="text_transcription_placeholder">Select a miasma to check for text transcription.</p>
                    <? } ?>
                </div>
            </div>
        </div>
        </div>

        <div style='height: 50px; width: 100%;'>
        </div>

        <script>
            window.miasmaDownloadPrefixes = <?=json_encode($download_name_prefixes)?>;
        </script>
        <script src="main.js?modified=<?=time()?>" defer></script>
    </body>
</html>
<?
    // remove whitespace in order to minify the html
    $main_content = preg_replace('/\s+/', ' ', ob_get_contents());

    ob_end_clean();
    echo $main_content;
?>
