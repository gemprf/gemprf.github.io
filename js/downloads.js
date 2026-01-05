/**
 * Centralized download links configuration.
 * Update file paths here and they will be used across all pages.
 */
const DOWNLOADS = {
  sample_config: {
    path: '/assets/gemprf_config/sample_config.xml',
    filename: 'sample_config.xml'
  }
};

/**
 * Helper function to initialize download buttons.
 * Usage: <a class="download-button" data-download-key="sample_config">Download</a>
 */
function initializeDownloadButtons() {
  const downloadButtons = document.querySelectorAll('[data-download-key]');
  downloadButtons.forEach(button => {
    const key = button.getAttribute('data-download-key');
    if (DOWNLOADS[key]) {
      button.href = DOWNLOADS[key].path;
      button.download = DOWNLOADS[key].filename;
    }
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDownloadButtons);
} else {
  initializeDownloadButtons();
}
