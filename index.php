<?
    // Preload Miasma
    $url_params = explode('/', $_SERVER['REQUEST_URI']);
    
    if (isset($url_params[2])) {
        $preloaded_miasma = $url_params[2];
    }
    
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

    $variety_groups = [
        'cambium' => ['group' => 'cambium', 'order' => 0],
        'cambium2' => ['group' => 'cambium', 'order' => 1],
        'waylemap' => ['group' => 'waylemap', 'order' => 0],
        'waylemap2' => ['group' => 'waylemap', 'order' => 1]
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

        <section id="slider_container" style='<?=(!empty($preloaded_miasma)) ? 'display: block;' : 'display: none;' ?>'>
            <div class="thumbnail thumbnail_slider" id="prevSlide"> </div>

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

            <div class="thumbnail2 thumbnail_slider" id="nextSlide"> </div>
        </section>

        <section id="mobile_view" style='display: none;'>
            <div id='mobile_grid'>
                <div class="prev_button" id="prev_button"></div>
                <div class="next_button" id="next_button"></div>
            </div>
        </section>

        <div id="notes" style='display: none;'>
            <h2>Trottering Notes</h2>
            
            <div class="tabs">
                <button class="tablinks active" onclick="openTab(event, 'game_notes');" id="game_notes_tab" role="tab">Widsith</button>
                <button class="tablinks" onclick="openTab(event, 'audio_notes');" id="audio_notes_tab" role="tab">Audio</button>
                <button class="tablinks" onclick="openTab(event, 'player_notes');" id="player_notes_tab" role="tab">Clerk Notes</button>
            </div>

            <div id="game_notes" class="tabcontent active">
                <? # Game-related notes go here. ?>
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
        </div>

        <div style='height: 50px; width: 100%;'>
        </div>

        <script src="compiled/main.js?modified=<?=time()?>" defer></script>
    </body>
</html>
<?
    // remove whitespace in order to minify the html
    $main_content = preg_replace('/\s+/', ' ', ob_get_contents());

    ob_end_clean();
    echo $main_content;
?>