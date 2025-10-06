// Makes a PHP request to get the notes based on miasma. runs after folderSearch.
function loadNotes(miasma) {
    // fetch
    fetch('trottering_notes.php?miasma=' + miasma)
    .then(response => response.text())
    .then(data => {
        document.getElementById('game_notes').innerHTML = data;
    });
}

function updateButtons(slider) {
    const update_button_content = (button_id, index) => {
        const element = document.getElementById(button_id);
        if (element) {
            element.innerHTML = slider.slider_items[index].innerHTML;
        } else {
            console.error(`Element with id "${button_id}" not found.`);
        }
    };

    ['prev_button', 'next_button', 'prevSlide', 'nextSlide'].forEach((id, i) => {
        update_button_content(id, i % 2 === 0 ? slider.prev_item_index : slider.next_item_index);
    });

    // activate magnifying glass
    // $('.slider-item .zoom').magnify().destroy();

    // setTimeout(() => {
        $('.slider-item:visible .zoom').magnify({speed: 0, magnify: 1.5});
    // }, 1500);
}

function changeFolder(folderName) {
    const slider = document.slider;
    if (slider) {
        slider.searchFolder(folderName);
        history.pushState({ folder: folderName }, '', '/miasma/' + (folderName ? folderName : ''));
        document.body.setAttribute('data-current-miasma', folderName);
        toggleVarietySwitcher(folderName);
    }
}

function toggleVarietySwitcher(miasma) {
    const varietySwitcher = document.getElementById('variety_switcher');
    const switchableVarieties = ['cambium', 'cambium2', 'waylemap', 'waylemap2'];
    
    if (switchableVarieties.includes(miasma)) {
        varietySwitcher.style.display = 'block';
        updateSwitchButtonText(miasma);
    } else {
        varietySwitcher.style.display = 'none';
    }
}

function updateSwitchButtonText(miasma) {
    const switchButton = document.getElementById('switch_variety');
    
    if (miasma === 'cambium') {
        switchButton.textContent = 'View Alternate Cambium';
    } else if (miasma === 'cambium2') {
        switchButton.textContent = 'View Original Cambium';
    } else if (miasma === 'waylemap') {
        switchButton.textContent = 'View Alternate Wayle Map';
    } else if (miasma === 'waylemap2') {
        switchButton.textContent = 'View Original Wayle Map';
    }
}

function switchVariety() {
    const currentMiasma = document.body.getAttribute('data-current-miasma');
    let newMiasma = '';
    
    if (currentMiasma === 'cambium') {
        newMiasma = 'cambium2';
    } else if (currentMiasma === 'cambium2') {
        newMiasma = 'cambium';
    } else if (currentMiasma === 'waylemap') {
        newMiasma = 'waylemap2';
    } else if (currentMiasma === 'waylemap2') {
        newMiasma = 'waylemap';
    }
    
    if (newMiasma) {
        changeFolder(newMiasma);
        // don't update the select dropdown for variety switching
    }
}

function openTab(evt, tabName) {
    if (tabName === 'game_notes') {
        $('#game_notes').show();
        $('#game_notes_tab').addClass('active');
        $('#player_notes').hide();
        $('#player_notes_tab').removeClass('active');

    } else if (tabName === 'player_notes') {
        $('#game_notes').hide();
        $('#game_notes_tab').removeClass('active');
        $('#player_notes').show();
        $('#player_notes_tab').addClass('active');
    }
}

class Slider {
    constructor(slider_elem) {
        this.slider = slider_elem;
        this.slider_items = slider_elem.getElementsByClassName('slider-item');
        this.current_index = 0;
        this.visible_indices = Array.from(this.slider_items).map((_, index) => index);
        this.setIndices();
        this.showSlide(this.current_index);
    }

    setIndices() {
        const visible_items_count = this.visible_indices.length;
        const current_visible_index = this.visible_indices.indexOf(this.current_index);
        this.prev_item_index = this.visible_indices[(current_visible_index - 1 + visible_items_count) % visible_items_count];
        this.next_item_index = this.visible_indices[(current_visible_index + 1) % visible_items_count];
        
        this.preloadImages(); // Call the preload method here
    }

    // Method to preload images
    preloadImages() {
        const preloadImage = (index) => {
            const imgElement = this.slider_items[index].querySelector('img');
            if (imgElement && imgElement.hasAttribute('loading')) {
                imgElement.removeAttribute('loading'); // Remove lazy loading for preloading
            }
        };

        preloadImage(this.prev_item_index);
        preloadImage(this.next_item_index);
    }

    slide(direction) {
        if (this.is_sliding) return;
        this.is_sliding = true;
    
        const next_index = direction === "NEXT" ? this.next_item_index : this.prev_item_index;
        const action_classes = direction === "NEXT" ? ["next-item", "slide-next"] : ["prev-item", "slide-prev"];
        
        this.slider_items[next_index].classList.add(action_classes[0]);
        this.slider_items[this.current_index].classList.add(action_classes[1]);
    
        // Set the next slide to the end state of the animation immediately, as we are controlling the visibility through the showSlide method
        this.slider_items[next_index].classList.add("active");
    
        setTimeout(() => {
            this.slider_items[next_index].classList.remove(action_classes[0]);
            this.slider_items[this.current_index].classList.remove(action_classes[1], "active");
    
            // Update current_index before calling showSlide
            this.current_index = next_index;
            
            this.showSlide(this.current_index);
    
            this.is_sliding = false;
            this.setIndices();
            updateButtons(this);
        }, 10);
    }
    

    next() {
        const next_index = this.visible_indices.indexOf(this.next_item_index);
        if (next_index !== -1) {
            this.slide("NEXT");
        }
    }

    prev() {
        const prev_index = this.visible_indices.indexOf(this.prev_item_index);
        if (prev_index !== -1) {
            this.slide("PREV");
        }
    }

    searchFolder(folder_name) {
        const sliderContainer = document.querySelector('#slider_container');
        const mobileView = document.querySelector('#mobile_view');
        const chooseMiasma = document.querySelector('#choose_miasma');
        const notes = document.querySelector('#notes');

        if (folder_name === '') { // "all"
            if (sliderContainer) sliderContainer.style.display = 'none';
            if (mobileView) mobileView.style.display = 'none';
            if (notes) notes.style.display = 'none';

            if (chooseMiasma) chooseMiasma.style.display = 'block';
            
            // Since we are handling a special case, we don't proceed with the usual logic
            return;
        } else {
            if (sliderContainer) sliderContainer.style.display = 'flex';
            if (mobileView) mobileView.style.display = 'flex';
            if (notes) notes.style.display = 'block';
            
            if (chooseMiasma) chooseMiasma.style.display = 'none';

            loadNotes(folder_name);
        }
        
        // Reset the visible_indices array
        this.visible_indices = [];

        // Loop through all slider_items and find those that match the folder_name
        Array.from(this.slider_items).forEach((slide, index) => {
            if (slide.getAttribute('data-folder') === folder_name || folder_name === 'all') {
                this.visible_indices.push(index); // Only add the index if the slide belongs to the folder
                slide.style.display = '';
            } else {
                slide.style.display = 'none';
            }
        });

        // If no slides match the folder, handle appropriately (e.g., show a message or reset to 'all')
        if (this.visible_indices.length === 0) {
            console.error(`No slides found for the folder "${folder_name}".`);
            return;
        }

        // Set the current index to the first visible slide
        this.current_index = this.visible_indices[0];
        this.setIndices();

        this.showSlide(this.current_index);

        updateButtons(this);

        // SINGLE-SLIDE SUPPORT. Define the folders that should have disabled navigation buttons
        const singleSlideFolders = ['hislatitude', 'incineration', 'frontispiece', 'vaseandcup'];

        // Check if the folder is in the list of single slide folders
        const isSingleSlideFolder = singleSlideFolders.includes(folder_name);

        // Get the navigation buttons
        const prevButton = document.getElementById('prev_button');
        const prevButton2 = document.getElementById('prevSlide');
        const nextButton = document.getElementById('next_button');
        const nextButton2 = document.getElementById('nextSlide');

        // Function to toggle disabled state on buttons
        const toggleButtonDisabled = (button, isDisabled) => {
            button.classList.toggle('disabled-button', isDisabled);

            // hide/show the button based on the disabled state
            if (isDisabled) {
                button.style.display = 'none';
            } else {
                button.style.display = '';
            }
        };

        // Toggle the disabled class based on whether the folder has a single slide
        toggleButtonDisabled(prevButton, isSingleSlideFolder);
        toggleButtonDisabled(nextButton, isSingleSlideFolder);
        toggleButtonDisabled(prevButton2, isSingleSlideFolder);
        toggleButtonDisabled(nextButton2, isSingleSlideFolder);
    }
    
    // You might need a method to show the new current slide:
    showSlide(index) {
        // Hide all slides initially
        Array.from(this.slider_items).forEach(slide => {
            slide.classList.remove('active');
            slide.style.display = 'none';
        });
    
        // Show the specified slide by index
        const newSlide = this.slider_items[index];
        if(newSlide) {
            newSlide.classList.add('active');
            newSlide.style.display = 'block';
        } else {
            console.error('Slide with specified index does not exist:', index);
        }
    
        // Set the current index to the specified index
        this.current_index = index;
    
        // Update buttons as per the new current slide
        updateButtons(this);
    }
}


window.onpopstate = function(event) {
    const folderFromUrl = window.location.pathname.replace(/\/$/, '').split('/miasma/')[1] || '';
    const slider = document.slider;
    if (slider) {
        slider.searchFolder(folderFromUrl);
        // only update select if it's not a variety switch
        if (!['cambium2', 'waylemap2'].includes(folderFromUrl)) {
            document.getElementById('folderSelect').value = folderFromUrl;
        }
        document.body.setAttribute('data-current-miasma', folderFromUrl);
        toggleVarietySwitcher(folderFromUrl);
    }
};

document.addEventListener("DOMContentLoaded", function() {
    const slider = new Slider(document.querySelector(".slider"));
    document.slider = slider;
    
    document.getElementById('prevSlide').addEventListener('click', () => slider.prev());
    document.getElementById('nextSlide').addEventListener('click', () => slider.next());
    document.getElementById('prev_button').addEventListener('click', () => slider.prev());
    document.getElementById('next_button').addEventListener('click', () => slider.next());
    document.getElementById('switch_variety').addEventListener('click', () => switchVariety());

    window.addEventListener('keydown', (event) => {
        if (event.code === 'ArrowRight') {
            slider.next();
            event.preventDefault();
        } else if(event.code === 'ArrowLeft') {
            slider.prev();
            event.preventDefault();
        }

        updateButtons(slider);
    });

    // Event listeners for folder searching
    document.querySelectorAll('[data-searchFolder]').forEach(li => {
        li.addEventListener('click', function() {
            const folderName = this.getAttribute('data-searchFolder');
            slider.searchFolder(folderName);
        });
    });

    document.getElementById("game_notes_tab").click();

    // LOAD MIASMA FROM URL
    const folderFromUrl = window.location.pathname.replace(/\/$/, '').split('/miasma/')[1] || '';
    
    // handle alternate versions in initial URL load
    let selectValue = folderFromUrl;
    if (folderFromUrl === 'cambium2') {
        selectValue = 'cambium';
    } else if (folderFromUrl === 'waylemap2') {
        selectValue = 'waylemap';
    }

    slider.searchFolder(folderFromUrl);
    document.getElementById('folderSelect').value = selectValue;
    document.body.setAttribute('data-current-miasma', folderFromUrl);
    toggleVarietySwitcher(folderFromUrl);

    // Initialize
    updateButtons(slider);
});