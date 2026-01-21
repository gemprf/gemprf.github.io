// Config Generator JavaScript
// Handles form interactions, validation, XML generation, and preview

// ============================================================================
// HELP TEXT LIBRARY
// ============================================================================

const fieldHelpText = {
    version: "The version of the GEMpRF configuration file format. This generator only supports the current version.",
    filename_datasrc: "This will be used in the generated filename. Provide a short identifier for your data source (e.g., HCP, NYU, your study name).",
    filename_stimulus: "This will be used in the generated filename. Provide the type of stimulus/aperture used in your experiment (e.g., 'fixed bar', 'expanding ring'). Limited to 5 words.",
    filename_description: "This will be used in the generated filename. Provide a brief description of your analysis configuration (e.g., 'high res analysis'). Limited to 10 words.",
    refine_enable: "Enable or disable the refine fitting step, which performs optimization on the initial grid search results. If you have limited computational resources, you may choose to disable this step and instead use a sufficiently dense grid search.",
    refine_gpu: "If enabled, the refine fitting will be executed on GPU (if available) for faster processing. Ensure sufficient GPU memory.",
    stim_dir: "Path to the directory containing stimulus files in Nifti format (.nii or .nii.gz). NOTE: This should be a directory, not a single file.",
    visual_field: "The radius of the visual field in degrees. This defines the spatial extent of the stimulus. Check your study paradigm for correct value.",
    stim_width: "Width of the stimulus in pixels.",
    stim_height: "Height of the stimulus in pixels.",
    binarization_enable: "If enabled, the stimulus will be binarized using the specified threshold.",
    binarization_threshold: "Threshold value for binarization. Values above this will be set to 1, below to 0.",
    high_temporal_enable: "Enable if using high temporal resolution stimulus. The model will compute signals at high resolution then downsample.",
    num_frames: "This should match your fMRI timecourse length. This is the number of frames after downsampling of a high temporal resolution stimulus.",
    slice_time_ref: "Slice timing reference for temporal interpolation (0 to 1). See documentation for details.",
    data_type: "Choose whether your data is organized in BIDS format or you want to specify fixed file paths directly.",
    bids_run_type: "For BIDS data: choose 'individual' to analyze single runs, or 'concatenated' to combine multiple runs.",
    bids_basepath: "Root directory of your BIDS dataset.",
    bids_append: "Comma-separated subdirectories to append to the base path (e.g., 'derivatives, fmriprep'). These are the subdirectories inside BIDS basepath that could lead to 'analysis' folders.",
    results_id: "Identifier for this analysis run. Results will be saved in 'analysis-{id}' directory. You may choose any name.",
    results_overwrite: "If disabled then, the existing results with the same analysis ID will be backed up with a timestamp, else the new results will be written in the existing results directory (files will be overwritten if already exist).",
    bids_analysis: "Analysis identifier(s). Use comma-separated values or 'all'. If 'all', the program would process all analyses available in the dataset.",
    bids_sub: "Subject identifier(s). Use comma-separated values or 'all' to process all subjects. If 'all', the program would process all subjects in the current analysis.",
    bids_hemi: "Hemisphere(s) to process. Use 'L', 'R', comma-separated, or 'all'. If 'all', both hemispheres will be processed.",
    bids_space: "Coordinate space of the data (e.g., 'fsnative', 'fsaverage', 'T1w'). Use 'all' for all available spaces.",
    bids_extension: "Input file extension: '.nii.gz' for volumetric, '.gii' for surface, or 'both' to process all available.",
    individual_task: "Task name for individual analysis. CAUTION: Only ONE value is allowed.",
    individual_ses: "Session identifier(s). Use comma-separated values or 'all'. If you choose 'all', the program would process all sessions for the specified subject(s).",
    individual_run: "Run identifier(s). Use comma-separated values or 'all'. If you choose 'all', the program would process all runs for the specified session(s).",
    concat_items: "JSON array defining which runs to concatenate. Each item should specify ses, task, and run.",
    fixed_stim_path: "Direct filepath to the stimulus file (.nii.gz format).",
    fixed_results_basepath: "Directory where results will be saved.",
    fixed_filename_postfix: "Custom text to append to result filenames (e.g., '-sample').",
    fixed_prepend_date: "If enabled, current date will be prepended to result filenames.",
    prf_model: "Population receptive field model type. Currently only '2D Gaussian' is available.",
    batches: "Number of batches for processing. Higher values use less memory but may be slower. This value decides how many fMRI voxels/vertices are processed together.",
    default_gpu: "Index of the default GPU to use (typically 0 for the first GPU). Choose the one with the maximum free memory.",
    write_debug: "If enabled, additional debug information will be written during processing. However, this may slow down the analysis.",
    optional_params_enable: "Enable to use custom HRF, sigmas, and spatial grid from an external file instead of default parameters.",
    optional_params_filepath: "Path to HDF5 file containing custom analysis parameters.",
    hrf_use_file: "Use HRF (Hemodynamic Response Function) values from the parameters file.",
    hrf_key: "HDF5 key/path to the HRF data in the parameters file.",
    sigmas_use_file: "Use pRF size (sigma) values from the parameters file.",
    sigmas_key: "HDF5 key/path to the sigma values in the parameters file.",
    spatial_grid_use_file: "Use spatial grid (x,y positions) from the parameters file.",
    spatial_grid_key: "HDF5 key/path to the spatial grid in the parameters file.",
    hrf_t: "Time range for HRF in seconds (start, end). E.g., (0, 45).",
    hrf_tr: "Repetition time (TR) of your fMRI acquisition in seconds.",
    hrf_peak_delay: "Peak delay parameter for SPM HRF model.",
    hrf_under_delay: "Undershoot delay parameter for SPM HRF model.",
    hrf_peak_disp: "Peak dispersion parameter for SPM HRF model.",
    hrf_under_disp: "Undershoot dispersion parameter for SPM HRF model.",
    hrf_peak_to_under: "Ratio of peak to undershoot for SPM HRF model.",
    hrf_normalize: "If enabled, the HRF will be normalized to have a peak of 1.",
    spatial_vf_radius: "Visual field radius in degrees for the default spatial grid.",
    spatial_num_h: "Number of horizontal pRF positions in the grid search.",
    spatial_num_v: "Number of vertical pRF positions in the grid search.",
    num_sigmas: "Number of different pRF sizes (sigma values) to test in grid search.",
    min_sigma: "Minimum pRF size (sigma) in degrees.",
    max_sigma: "Maximum pRF size (sigma) in degrees.",
    ndct_value: "Number of DCT (Discrete Cosine Transform) bases for modeling low-frequency drift. Generates (2 * nDCT + 1) regressors."
};

// ============================================================================
// MOBILE DETECTION & XML RENDERING CONTROL
// ============================================================================

// Track if the XML disabled modal has been shown
let xmlDisabledModalShown = false;

/**
 * Detects if the device is a mobile device (excluding iPad)
 * @returns {boolean}
 */
function isMobileDevice() {
    const ua = navigator.userAgent.toLowerCase();
    // Check if it's an iPad or other tablet
    const isTablet = /ipad|android(?!.*mobi)/i.test(ua);
    if (isTablet) return false;
    
    // Check for mobile devices
    const mobileRegex = /mobile|android|webos|iphone|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(ua);
}

/**
 * Detects if device is in portrait mode (height > width)
 * @returns {boolean}
 */
function isPortraitMode() {
    return window.innerHeight > window.innerWidth;
}

/**
 * Determines if XML rendering should be disabled
 * Disabled on: non-iPad mobile devices OR portrait mode
 * @returns {boolean}
 */
function shouldDisableXmlRendering() {
    const isNonIpadMobile = isMobileDevice();
    const inPortrait = isPortraitMode();
    return isNonIpadMobile || inPortrait;
}

/**
 * Disables the XML rendering container and shows warning modal only once
 */
function disableXmlRendering() {
    const rightPanel = document.getElementById('rightPanel');
    const resizer = document.getElementById('horizontal_resizer');
    const modal = document.getElementById('xmlDisabledModal');
    
    if (rightPanel) {
        rightPanel.style.display = 'none';
    }
    if (resizer) {
        resizer.style.display = 'none';
    }
    // Only show modal if it hasn't been shown before
    if (modal && !xmlDisabledModalShown) {
        modal.style.display = 'flex';
        xmlDisabledModalShown = true;
    }
}

/**
 * Enables the XML rendering container and hides the warning modal
 */
function enableXmlRendering() {
    const rightPanel = document.getElementById('rightPanel');
    const resizer = document.getElementById('horizontal_resizer');
    const modal = document.getElementById('xmlDisabledModal');
    
    if (rightPanel) {
        rightPanel.style.display = '';
    }
    if (resizer) {
        resizer.style.display = '';
    }
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Closes the XML disabled modal
 */
function closeXmlDisabledModal() {
    const modal = document.getElementById('xmlDisabledModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Initializes XML rendering control on page load
 */
function initializeXmlRenderingControl() {
    if (shouldDisableXmlRendering()) {
        disableXmlRendering();
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    initializeDataTypeToggle();
    initializeBIDSRunTypeToggle();
    initCollapsibles();
    initResizableDivider();
    initializeSidebarState();
    initializeEmailObfuscation();
    initializeConfigFilename();
    addInfoIcons();
    initializeXmlRenderingControl();
    updatePreview();
});

// Handle orientation changes for mobile devices
window.addEventListener('orientationchange', function() {
    if (shouldDisableXmlRendering()) {
        disableXmlRendering();
    } else {
        enableXmlRendering();
    }
});

// Also handle window resize for portrait/landscape detection
window.addEventListener('resize', function() {
    if (shouldDisableXmlRendering()) {
        disableXmlRendering();
    } else {
        enableXmlRendering();
    }
});

function initializeForm() {
    const form = document.getElementById('configForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });
}

function initializeDataTypeToggle() {
    document.querySelectorAll('input[name="data_type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const bidsSection = document.getElementById('bids_section');
            const fixedSection = document.getElementById('fixed_paths_section');
            
            if (this.value === 'bids') {
                bidsSection.classList.remove('hidden');
                fixedSection.classList.add('hidden');
            } else {
                bidsSection.classList.add('hidden');
                fixedSection.classList.remove('hidden');
            }
            updatePreview();
        });
    });
}

function initializeBIDSRunTypeToggle() {
    document.getElementById('bids_run_type').addEventListener('change', function() {
        const individualSection = document.getElementById('individual_section');
        const concatenatedSection = document.getElementById('concatenated_section');
        
        if (this.value === 'individual') {
            individualSection.classList.remove('hidden');
            concatenatedSection.classList.add('hidden');
        } else {
            individualSection.classList.add('hidden');
            concatenatedSection.classList.remove('hidden');
        }
        updatePreview();
    });
}

function initializeSidebarState() {
    const sidebar = document.getElementById('configSidebar');
    if (!sidebar) return;
    
    const isCollapsed = localStorage.getItem('configSidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
    }
    
    if (typeof window.recalculatePanels === 'function') {
        window.recalculatePanels();
    }
}

function initializeEmailObfuscation() {
    const emailSpan = document.getElementById('contactEmail');
    if (emailSpan) {
        const email = 'siddharth.mittal' + '@' + 'meduniwien.ac.at';
        emailSpan.innerHTML = '<a href="mailto:' + email + '">' + email + '</a>';
    }
}

function initializeConfigFilename() {
    updateConfigFilename();
}

function addInfoIcons() {
    // Add info icons to all labels that have corresponding help text
    Object.keys(fieldHelpText).forEach(fieldId => {
        const label = document.querySelector(`label[for="${fieldId}"]`);
        if (label && !label.querySelector('.info-icon')) {
            const infoIcon = createInfoIcon(fieldHelpText[fieldId]);
            label.appendChild(infoIcon);
        }
    });
}

function createInfoIcon(helpText) {
    const icon = document.createElement('span');
    icon.className = 'info-icon';
    icon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M12 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
        </svg>
        <span class="info-tooltip">${helpText}</span>
    `;
    return icon;
}

// ============================================================================
// SIDEBAR TOGGLE
// ============================================================================

function toggleSidebarCollapse() {
    const sidebar = document.getElementById('configSidebar');
    if (!sidebar) return;
    
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('configSidebarCollapsed', isCollapsed);
    
    if (typeof window.recalculatePanels === 'function') {
        window.recalculatePanels();
    }
}

// ============================================================================
// PATH VALIDATION
// ============================================================================

function validatePath(path, type, requiredExtension = null) {
    if (!path || path.trim() === '') {
        return 'empty';
    }

    const fileExtensions = /\.(nii\.gz|nii|h5|hdf5|xml|txt|json|csv|xlsx|xls|pdf|zip|tar|gz)$/i;
    const hasExtension = fileExtensions.test(path);

    if (!hasExtension && (path.includes('Path/to') || path.includes('path/to') || path.includes('DIR_PATH'))) {
        return 'empty';
    }

    if (type === 'file') {
        if (requiredExtension) {
            const requiredExtRegex = new RegExp(requiredExtension.replace(/\./g, '\\.') + '$', 'i');
            if (!requiredExtRegex.test(path)) {
                return 'error';
            }
            return 'ok';
        }
        if (!hasExtension) {
            return 'warning';
        }
        return 'ok';
    } else if (type === 'directory') {
        if (hasExtension) {
            return 'error';
        }
        if (path.includes('/') || path.includes('\\')) {
            return 'ok';
        }
        return 'warning';
    }

    return 'empty';
}

function updatePathValidation(fieldId, expectedType, requiredExtension = null) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const validation = validatePath(field.value, expectedType, requiredExtension);
    const indicator = document.getElementById(fieldId + '_validation');
    if (!indicator) return;

    indicator.className = 'validation-message';
    indicator.title = '';
    indicator.textContent = '';

    if (validation === 'ok') {
        indicator.textContent = '';
    } else if (validation === 'error') {
        if (requiredExtension) {
            indicator.textContent = '(⛔ Must be ' + requiredExtension + ' file)';
        } else {
            indicator.textContent = '(⛔ Looks incorrect ' + expectedType + ')';
        }
        indicator.classList.add('error');
    } else if (validation === 'warning') {
        indicator.textContent = '(⚠ Uncertain - verify)';
        indicator.classList.add('warning');
    }
}

// ============================================================================
// PATH FIELD ACTIONS
// ============================================================================

function pastePath(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    navigator.clipboard.readText().then(text => {
        if (text) {
            target.value = text.trim();
            updatePreview();
        }
    }).catch(err => {
        const val = window.prompt('Enter or paste path', target.value || '');
        if (val !== null) {
            target.value = val;
            updatePreview();
        }
    });
}

function copyField(targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    navigator.clipboard.writeText(el.value).catch(() => {});
}

function clearField(targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.value = '';
    updatePreview();
    updatePathValidation(targetId, el.getAttribute('data-validation-type'), el.getAttribute('data-required-extension'));
    
    // Update filename if clearing a filename builder field
    if (targetId.startsWith('filename_')) {
        updateConfigFilename();
    }
}

// ============================================================================
// DYNAMIC DATA PATHS MANAGEMENT
// ============================================================================

function addDataPath() {
    const container = document.getElementById('data_paths_container');
    if (!container) return;

    const newEntry = document.createElement('div');
    newEntry.className = 'path-entry';
    newEntry.innerHTML = `
        <div class="path-input">
            <div class="input-container">
                <input type="text" class="data-path-input" value="" placeholder="path/to/data/file.nii.gz" oninput="updateDataPathsPreview()" data-validation-type="file">
                <button type="button" class="clear-btn" onclick="clearDataPath(this)" title="Clear field">✕</button>
            </div>
            <span class="validation-message"></span>
        </div>
        <button type="button" class="remove-btn" onclick="removeDataPath(this)">Remove</button>
    `;
    container.appendChild(newEntry);
    updateDataPathsPreview();
}

function removeDataPath(btn) {
    const entry = btn.closest('.path-entry');
    if (entry) {
        entry.remove();
        updateDataPathsPreview();
    }
}

function clearDataPath(btn) {
    const input = btn.closest('.input-container').querySelector('.data-path-input');
    if (input) {
        input.value = '';
        updateDataPathsPreview();
    }
}

function updateDataPathsPreview() {
    updatePreview();
}

// ============================================================================
// DYNAMIC GPU ENTRIES MANAGEMENT
// ============================================================================

function addGPUEntry() {
    const container = document.getElementById('gpu_list_container');
    if (!container) return;

    const newEntry = document.createElement('div');
    newEntry.className = 'path-entry';
    newEntry.innerHTML = `
        <div class="path-input">
            <div class="input-container">
                <input type="number" class="gpu-entry-input" value="" min="0" placeholder="GPU index" oninput="updatePreview()" data-validation-type="number">
                <button type="button" class="clear-btn" onclick="clearGPUEntry(this)" title="Clear field">✕</button>
            </div>
        </div>
        <button type="button" class="remove-btn" onclick="removeGPUEntry(this)">Remove</button>
    `;
    container.appendChild(newEntry);
    updatePreview();
}

function removeGPUEntry(btn) {
    const entry = btn.closest('.path-entry');
    if (entry) {
        entry.remove();
        updatePreview();
    }
}

function clearGPUEntry(btn) {
    const input = btn.closest('.input-container').querySelector('.gpu-entry-input');
    if (input) {
        input.value = '';
        updatePreview();
    }
}

// ============================================================================
// RESIZABLE DIVIDER
// ============================================================================

function initResizableDivider() {
    const container = document.querySelector('.config-wrapper');
    const left = document.getElementById('leftPanel');
    const right = document.getElementById('rightPanel');
    const resizer = document.getElementById('horizontal_resizer');
    if (!container || !left || !right || !resizer) return;

    const dividerWidth = () => resizer.getBoundingClientRect().width;
    const minLeft = 320;
    const minRight = 360;
    let dragging = false;

    const startDrag = (clientX) => {
        dragging = true;
        document.body.style.cursor = 'col-resize';
    };

    const stopDrag = () => {
        dragging = false;
        document.body.style.cursor = '';
    };

    const onMove = (clientX) => {
        const rect = container.getBoundingClientRect();
        let newLeft = clientX - rect.left;
        const dW = dividerWidth();
        const maxLeft = rect.width - minRight - dW;
        newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        left.style.width = newLeft + 'px';
        right.style.width = (rect.width - newLeft - dW) + 'px';
    };

    // Mouse events
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX);
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        onMove(e.clientX);
    });
    document.addEventListener('mouseup', stopDrag);

    // Touch events
    resizer.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length) {
            startDrag(e.touches[0].clientX);
        }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!dragging || !e.touches || !e.touches.length) return;
        onMove(e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener('touchend', stopDrag);

    // Set initial widths
    const initWidths = () => {
        const rect = container.getBoundingClientRect();
        const dW = dividerWidth();
        const half = Math.max(minLeft, Math.floor((rect.width - dW) / 2));
        left.style.width = half + 'px';
        right.style.width = (rect.width - half - dW) + 'px';
    };
    initWidths();
    window.recalculatePanels = initWidths;
    window.addEventListener('resize', initWidths);
}

// ============================================================================
// COLLAPSIBLE SECTIONS
// ============================================================================

function initCollapsibles() {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('collapsible');
        section.classList.remove('open');
        const header = section.querySelector('h2');
        if (header) {
            header.addEventListener('click', () => {
                section.classList.toggle('open');
            });
        }
    });
}

// ============================================================================
// XML GENERATION
// ============================================================================

function escapeXml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// Convert Windows style paths to forward slashes, then escape for XML
function normalizePathForXml(value) {
    if (!value) return '';
    return escapeXml(value.replace(/\\/g, '/'));
}

function generateXML() {
    const version = document.getElementById('version').value;
    const dataType = document.querySelector('input[name="data_type"]:checked').value;
    
    let xml = `<!-- 
    "@Author  		:   Siddharth Mittal",
    "@Contact 		:   siddharth.mittal@meduniwien.ac.at",
    "@License 		:   (C)Copyright 2024 - 2025, Medical University of Vienna",
    "@Cite DOI 		: 	https://doi.org/10.1016/j.media.2025.103891",
    "@Paper Title	: 	GPU-Empowered Mapping of Population Receptive Fields for Large-Scale fMRI Analysis"
-->

<root version="${version}">
  <refine_fitting enable="${document.getElementById('refine_enable').checked ? 'True' : 'False'}" refinefit_on_gpu="${document.getElementById('refine_gpu').checked ? 'True' : 'False'}"/> <!-- Execute refine fitting on GPU if sufficient GPU memory is available -->
  
  <!-- Stimulus data -->
  <stimulus comment="Only in Nifti Format">

    <!-- File path for stimulus directory -->
        <directory>${normalizePathForXml(document.getElementById('stim_dir').value)}</directory>	
    <visual_field>${document.getElementById('visual_field').value}</visual_field> <!-- Visual field Radius -->
    <width>${document.getElementById('stim_width').value}</width>
    <height>${document.getElementById('stim_height').value}</height>
    <binarization enable="${document.getElementById('binarization_enable').checked ? 'True' : 'False'}" threshold="${document.getElementById('binarization_threshold').value}"/> <!-- stimulus will be binarized if enabled, all values above threshold will be set to 1 and below to 0 -->
    
    <!-- Compute model signals with high-res stimulus then downsample -->
    <!-- "num_frames_downsampled" = your fMRI timecourse length -->
    <!-- "slice_time_ref" for details see https://www.alivelearn.net/?p=1037 -->
    <high_temporal_resolution enable="${document.getElementById('high_temporal_enable').checked ? 'true' : 'false'}" num_frames_downsampled="${document.getElementById('num_frames').value}" slice_time_ref="${document.getElementById('slice_time_ref').value}"/>
  </stimulus>

  <!-- Input Data -->
  <input_datasrc>
`;

    if (dataType === 'bids') {
        xml += generateBIDSSection();
    } else {
        xml += generateFixedPathsSection();
    }

    xml += `
  </input_datasrc>

  <!-- Analysis Model -->
  <pRF_model>
    <model>${document.getElementById('prf_model').value}</model> <!-- 2d_gaussian, (DoG, CSS not available at the moment) -->
  </pRF_model>

  <!-- Measured data section -->
  <measured_data>
    <batches>${document.getElementById('batches').value}</batches>
  </measured_data>

  <!-- GPU configuration -->
  <gpu>

    <!-- Default GPU -->
    <default_gpu>${document.getElementById('default_gpu').value}</default_gpu>

    <!-- Additional available GPUs -->
    <additional_available_gpus>
`;

    const gpuInputs = document.querySelectorAll('.gpu-entry-input');
    gpuInputs.forEach(input => {
        const gpuValue = input.value.trim();
        if (gpuValue) {
            xml += `      <gpu>${gpuValue}</gpu>\n`;
        }
    });

    xml += `    </additional_available_gpus>

  </gpu>

  <!-- Search space information -->
  <search_space write_debug_info="${document.getElementById('write_debug').checked ? 'true' : 'false'}">

    <!-- (OPTIONAL) Use custom provided HRF/pRF sizes/grid -->
        <optional_analysis_params enable="${document.getElementById('optional_params_enable').checked ? 'True' : 'False'}" filepath="${normalizePathForXml(document.getElementById('optional_params_filepath').value)}">
      <hrf use_from_file="${document.getElementById('hrf_use_file').checked ? 'True' : 'False'}" key="${escapeXml(document.getElementById('hrf_key').value)}"/>
      <sigmas use_from_file="${document.getElementById('sigmas_use_file').checked ? 'True' : 'False'}" key="${escapeXml(document.getElementById('sigmas_key').value)}"/>
      <spatial_grid_xy use_from_file="${document.getElementById('spatial_grid_use_file').checked ? 'True' : 'False'}" key="${escapeXml(document.getElementById('spatial_grid_key').value)}"/>
    </optional_analysis_params>

    <!-- (DEFAULT) parameters when optional_analysis_params=False -->
    <!-- SPM HRF parameters -->
    <default_hrf t="${escapeXml(document.getElementById('hrf_t').value)}" TR="${document.getElementById('hrf_tr').value}" peak_delay="${document.getElementById('hrf_peak_delay').value}" under_shoot_delay="${document.getElementById('hrf_under_delay').value}"
                 peak_disp="${document.getElementById('hrf_peak_disp').value}" under_disp="${document.getElementById('hrf_under_disp').value}" peak_to_undershoot="${document.getElementById('hrf_peak_to_under').value}"
                 normalize="${document.getElementById('hrf_normalize').checked ? 'true' : 'false'}"/>
                
    <default_spatial_grid visual_field_radius="${document.getElementById('spatial_vf_radius').value}"
                          num_horizontal_prfs="${document.getElementById('spatial_num_h').value}"
                          num_vertical_prfs="${document.getElementById('spatial_num_v').value}"/>

    <default_sigmas num_sigmas="${document.getElementById('num_sigmas').value}" min_sigma="${document.getElementById('min_sigma').value}" max_sigma="${document.getElementById('max_sigma').value}"/>
    <nDCT value="${document.getElementById('ndct_value').value}" comment="DCT bases to account for low frequency drift. Generate (2 * nDCT + 1) cosine regressors"/>

  </search_space>

</root>`;

    return xml;
}

function generateBIDSSection() {
    const runType = document.getElementById('bids_run_type').value;
        const basepath = normalizePathForXml(document.getElementById('bids_basepath').value);
        const appendPath = normalizePathForXml(document.getElementById('bids_append').value);
    
    let xml = `
	<!-- Set to "True" if the input data is organized in BIDS format, select "individual" or "concatenated" run type -->
    <BIDS enable="True" run_type="${runType}" comment="options are individual/concatenated">
	
            <basepath>${basepath}</basepath>
            <append_to_basepath>${appendPath}</append_to_basepath>

      <!-- Directory name for results; backups created with timestamp if overwrite="True" -->
      <results_anaylsis_id overwrite="${document.getElementById('results_overwrite').checked ? 'True' : 'False'}">${escapeXml(document.getElementById('results_id').value)}</results_anaylsis_id>

      <!-- NOTE: Case sensitive, provide the exact values!!!
           For the analysis, sub, ses, task, run, hemi,
           either provide comma separated values or specify "all"
           Sample: <analysis>01, 02</analysis> or <analysis>all</analysis>
      -->
      <analysis>${escapeXml(document.getElementById('bids_analysis').value)}</analysis>
      <sub>${escapeXml(document.getElementById('bids_sub').value)}</sub>
      <hemi>${escapeXml(document.getElementById('bids_hemi').value)}</hemi>
      <space comment="e.g. fsaverage/fsnative/T1w or all">${escapeXml(document.getElementById('bids_space').value)}</space>
	  
	  <!-- IMPORTANT: volumetric files will be flattend, and only files ending with '_bold.nii.gz' or '_bold.func.gii' will be processed -->
      <input_file_extension comment="options are .nii.gz/.gii/both">${document.getElementById('bids_extension').value}</input_file_extension>
`;

    if (runType === 'individual') {
        xml += `        
      <!-- INDIVIDUAL Task/stimulus Analysis -->
      <individual>
        <task>${escapeXml(document.getElementById('individual_task').value)}</task> <!-- ONLY one value is allowed -->
        <ses>${escapeXml(document.getElementById('individual_ses').value)}</ses>        <!-- comma separated values or "all" -->
        <run>${escapeXml(document.getElementById('individual_run').value)}</run>        <!-- comma separated values or "all" -->
      </individual>
`;
    } else {
        xml += `
      <!-- CONCATENATED Analysis -->
      <concatenated>
`;
        try {
            const items = JSON.parse(document.getElementById('concat_items').value);
            items.forEach(item => {
                xml += `
        <concatenate_item>
          <ses>${escapeXml(item.ses)}</ses> 		<!-- ONLY one value is allowed -->
          <task>${escapeXml(item.task)}</task>	<!-- ONLY one value is allowed -->
          <run>${escapeXml(item.run)}</run> 			<!-- ONLY one value is allowed -->
        </concatenate_item>
`;
            });
        } catch (e) {
            xml += `
        <concatenate_item>
          <ses>01</ses>
          <task>fixedbar</task>
          <run>1</run>
        </concatenate_item>
`;
        }
        xml += `
      </concatenated>
`;
    }

    xml += `
    </BIDS>

    <!-- OR, make Bids False and specify directly single/multiple filepaths -->
    <fixed_paths>
      <stimulus_filepath>D:/GEMpRF-DemoKit/example_data/stimuli/task-bar_apertures.nii.gz</stimulus_filepath>
      <measured_data_filepath comment="Add one or more measured-data filepaths here. Use a separate filepath block for each entry.">
        <filepath>path/to/data/file.nii.gz</filepath>
      </measured_data_filepath>
      <results>
        <basepath>path/to/results/</basepath>
        <custom_filename_postfix>-sample</custom_filename_postfix>
        <prepend_date>True</prepend_date>
      </results>
    </fixed_paths>
`;

    return xml;
}

function generateFixedPathsSection() {
    const fixedStimPath = normalizePathForXml(document.getElementById('fixed_stim_path').value);
    const fixedResultsBase = normalizePathForXml(document.getElementById('fixed_results_basepath').value);

    let xml = `
	<!-- Set to "True" if the input data is organized in BIDS format, select "individual" or "concatenated" run type -->
    <BIDS enable="False" run_type="individual" comment="options are individual/concatenated">
      <basepath>Path/to/data/BIDS</basepath>
      <append_to_basepath>derivatives, fmriprep</append_to_basepath>
      <results_anaylsis_id overwrite="False">GEMDataAnalysisResults</results_anaylsis_id>
      <analysis>01</analysis>
      <sub>all</sub>
      <hemi>all</hemi>
      <space comment="e.g. fsaverage/fsnative/T1w or all">fsnative</space>
      <input_file_extension comment="options are .nii.gz/.gii/both">.gii</input_file_extension>
      <individual>
        <task>fixedbar</task>
        <ses>all</ses>
        <run>all</run>
      </individual>
    </BIDS>

    <!-- OR, make Bids False and specify directly single/multiple filepaths -->
    <fixed_paths>
            <stimulus_filepath>${fixedStimPath}</stimulus_filepath>
      <measured_data_filepath comment="Add one or more measured-data filepaths here. Use a separate filepath block for each entry.">
`;

    const dataPathInputs = document.querySelectorAll('.data-path-input');
    let hasValidPath = false;
    dataPathInputs.forEach(input => {
        const path = input.value.trim();
        if (path) {
            xml += `        <filepath>${normalizePathForXml(path)}</filepath>\n`;
            hasValidPath = true;
        }
    });
    
    if (!hasValidPath) {
        xml += `        <filepath>path/to/data/file.nii.gz</filepath>\n`;
    }

    xml += `      </measured_data_filepath>
      <results>

        <!--  directory for results  -->
    <basepath>${fixedResultsBase}</basepath>
        
        <!--  Custom result filename postfix  -->
        <custom_filename_postfix>${escapeXml(document.getElementById('fixed_filename_postfix').value)}</custom_filename_postfix>
        
        <!--  Flag to prepend date  -->
        <prepend_date>${document.getElementById('fixed_prepend_date').checked ? 'True' : 'False'}</prepend_date>
        
      </results>

    </fixed_paths>
`;

    return xml;
}

// ============================================================================
// PREVIEW UPDATE
// ============================================================================

function updatePreview() {
    const xml = generateXML();
    const preview = document.getElementById('xmlPreview');
    if (!preview) return;

    preview.innerHTML = '<pre class="line-numbers"><code id="xmlCode" class="language-markup"></code></pre>';
    const codeEl = document.getElementById('xmlCode');
    codeEl.textContent = xml;

    if (window.Prism && typeof Prism.highlightElement === 'function') {
        Prism.highlightElement(codeEl);
    }
}

// ============================================================================
// DOWNLOAD & COPY ACTIONS
// ============================================================================

function downloadXML() {
    const xml = generateXML();
    const filename = getConfigFilename();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function copyToClipboard() {
    const xml = generateXML();
    navigator.clipboard.writeText(xml).then(() => {
        alert('XML copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// ============================================================================
// CONFIG FILENAME BUILDER
// ============================================================================

function getConfigFilename() {
    const datasrc = document.getElementById('filename_datasrc').value.trim();
    const stimulus = document.getElementById('filename_stimulus').value.trim();
    const description = document.getElementById('filename_description').value.trim();
    
    let filename = 'config-gemprf';
    if (datasrc) {
        filename += '_data-' + datasrc.replace(/\s+/g, '-');
    }
    if (stimulus) {
        filename += '_stimulus-' + stimulus.replace(/\s+/g, '-');
    }
    if (description) {
        filename += '_desc-' + description.replace(/\s+/g, '-');
    }
    
    filename += '.xml';
    return filename;
}

function updateConfigFilename() {
    const filename = getConfigFilename();
    document.getElementById('configFilenameDisplay').textContent = filename;
}

function limitWords(input, maxWords) {
    const words = input.value.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length > maxWords) {
        input.value = words.slice(0, maxWords).join(' ');
    }
}
