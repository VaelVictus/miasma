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

    ['next_button', 'prev_button'].forEach(id => {
        const element = document.getElementById(id);
        if (element && element.firstElementChild) {
            element.firstElementChild.style.borderRadius = '5px';
        }
    });

    // activate magnifying glass
    $('.slider-item .zoom').magnify().destroy();
    $('.slider-item:visible .zoom').magnify({speed: 0});
}

function changeFolder(folderName) {
    const slider = document.slider; // Assuming you have a reference to the Slider instance
    if (slider) {
        slider.searchFolder(folderName);
    }
}

function openTab(evt, tabName) {
    evt.preventDefault();
    
    // Declare all variables
    let i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

class Slider {
    constructor(slider_elem) {
        this.slider = slider_elem;
        this.slider_items = slider_elem.getElementsByClassName('slider-item');
        this.current_index = 0;
        this.visible_indices = Array.from(this.slider_items).map((_, index) => index); // All slides are initially visible
        this.setIndices();
        this.showSlide(this.current_index); // Show the first slide upon initialization
    }

    setIndices() {
        const visible_items_count = this.visible_indices.length;
        const current_visible_index = this.visible_indices.indexOf(this.current_index);
        this.prev_item_index = this.visible_indices[(current_visible_index - 1 + visible_items_count) % visible_items_count];
        this.next_item_index = this.visible_indices[(current_visible_index + 1) % visible_items_count];
    }

    slide(direction) {
        if (this.is_sliding) return;
        this.is_sliding = true;
    
        const next_index = direction === "NEXT" ? this.next_item_index : this.prev_item_index;
        const action_classes = direction === "NEXT" ? ["next-item", "slide-next"] : ["prev-item", "slide-prev"];
        
        // Prepare the next slide
        this.slider_items[next_index].classList.add(action_classes[0]);
    
        // Animate out the current slide
        this.slider_items[this.current_index].classList.add(action_classes[1]);
    
        // Set the next slide to the end state of the animation immediately,
        // as we are controlling the visibility through the showSlide method
        this.slider_items[next_index].classList.add("slide-end", "active");
    
        setTimeout(() => {
            // Remove animation classes
            this.slider_items[next_index].classList.remove(action_classes[0], "slide-end");
            this.slider_items[this.current_index].classList.remove(action_classes[1], "active");
    
            // Update current_index before calling showSlide
            this.current_index = next_index;
            
            // Now, use the showSlide method to ensure correct display
            this.showSlide(this.current_index);
    
            this.is_sliding = false;
            this.setIndices();
            updateButtons(this);
        }, 50); // Ensure this duration is equal or greater than the CSS transition-duration
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

        // Check if the folder_name is blank
        if (folder_name === '') {
            // Hide .slider_container and .mobile_view
            if (sliderContainer) sliderContainer.style.display = 'none';
            if (mobileView) mobileView.style.display = 'none';
            if (notes) notes.style.display = 'none';

            // Show .choose_miasma
            if (chooseMiasma) chooseMiasma.style.display = 'block';
            
            // Since we are handling a special case, we don't proceed with the usual logic
            return;
        } else {
            // If folder_name is not blank, revert to the original display, or you might want to use 'flex' or 'grid' etc. depending on your CSS.
            if (sliderContainer) sliderContainer.style.display = 'flex';
            if (mobileView) mobileView.style.display = 'flex';
            if (notes) notes.style.display = 'block';
            
            // Hide .choose_miasma
            if (chooseMiasma) chooseMiasma.style.display = 'none';

            // load notes
            loadNotes(folder_name);
        }
        
        // Reset the visible_indices array
        this.visible_indices = [];

        // Loop through all slider_items and find those that match the folder_name
        Array.from(this.slider_items).forEach((slide, index) => {
            if (slide.getAttribute('data-folder') === folder_name || folder_name === 'all') {
                this.visible_indices.push(index); // Only add the index if the slide belongs to the folder
                slide.style.display = ''; // Make the slide visible
            } else {
                slide.style.display = 'none'; // Hide the slide
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

        // Ensure the new current slide is shown correctly
        this.showSlide(this.current_index);

        // Update buttons and other UI elements as needed
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
            slide.style.display = 'none'; // Make sure all slides are hidden initially
        });
    
        // Show the specified slide by index
        const newSlide = this.slider_items[index];
        if(newSlide) {
            newSlide.classList.add('active');
            newSlide.style.display = 'block'; // Make only the specified slide visible
        } else {
            console.error('Slide with specified index does not exist:', index);
        }
    
        // Set the current index to the specified index
        this.current_index = index;
    
        // Update buttons as per the new current slide
        updateButtons(this);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const slider = new Slider(document.querySelector(".slider"));
    document.slider = slider;
    
    // Adding event listeners programmatically
    document.getElementById('prevSlide').addEventListener('click', () => slider.prev());
    document.getElementById('nextSlide').addEventListener('click', () => slider.next());
    document.getElementById('prev_button').addEventListener('click', () => slider.prev());
    document.getElementById('next_button').addEventListener('click', () => slider.next());

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

    // default tab to Game
    document.getElementById("defaultOpen").click();

    // Initialize
    updateButtons(slider);
});