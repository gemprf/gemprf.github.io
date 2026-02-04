// doi-badges.js - Centralized DOI badge management

const DOI_BADGES = {
    paper: {
        doi: '10.1016/j.media.2025.103891',
        url: 'https://doi.org/10.1016/j.media.2025.103891',
        badgeUrl: 'https://img.shields.io/badge/DOI-10.1016%2Fj.media.2025.103891-blue',
        alt: 'DOI'
    },
    documentation: {
        doi: '10.5281/zenodo.18475202',
        url: 'https://doi.org/10.5281/zenodo.18475202',
        badgeUrl: 'https://zenodo.org/badge/1062662188.svg',
        alt: 'DOI'
    }
};

/**
 * Generate HTML for a DOI badge
 * @param {string} type - Type of badge: 'paper' or 'documentation'
 * @param {object} options - Optional styling and attributes
 * @returns {string} HTML string for the badge
 */
function getDOIBadgeHTML(type, options = {}) {
    const badge = DOI_BADGES[type];
    if (!badge) {
        console.error(`Unknown DOI badge type: ${type}`);
        return '';
    }
    
    const style = options.style || '';
    const imgStyle = options.imgStyle || '';
    const linkStyle = options.linkStyle || '';
    
    return `<a href="${badge.url}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">
                <img src="${badge.badgeUrl}" alt="${badge.alt}" style="${imgStyle}">
            </a>`;
}

/**
 * Insert a DOI badge into an element
 * @param {string} elementId - ID of the element to insert the badge into
 * @param {string} type - Type of badge: 'paper' or 'documentation'
 * @param {object} options - Optional styling and attributes
 */
function insertDOIBadge(elementId, type, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element not found: ${elementId}`);
        return;
    }
    
    element.innerHTML = getDOIBadgeHTML(type, options);
}

/**
 * Get DOI information
 * @param {string} type - Type of DOI: 'paper' or 'documentation'
 * @returns {object} DOI information object
 */
function getDOIInfo(type) {
    return DOI_BADGES[type] || null;
}

// Export for use in modules or make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getDOIBadgeHTML, insertDOIBadge, getDOIInfo, DOI_BADGES };
}
