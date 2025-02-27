// Ensure WordPress components and element are available
const { render, createElement } = wp.element;
const { Tooltip, Dashicon } = wp.components; // Import Dashicon for the info icon
import './styles/scss/tooltips.scss';

// Function to initialize tooltips
function initializeTooltips() {
    // Select all elements with the 'highlight' class and a 'data-tooltip' attribute
    document.querySelectorAll('.highlight[data-tooltip]').forEach((el) => {
        const tooltipContent = el.dataset.tooltip;

        // Render a Tooltip component into each matching element
        render(
            createElement(
                Tooltip,
                {
                    text: createElement(
                        'div', // Tooltip content wrapper
                        { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, // Layout styling
                        createElement(Dashicon, { icon: 'info-outline', style: { color: '#007cba' } }), // Info icon
                        createElement('span', null, tooltipContent) // Tooltip text
                    ),
                },
                createElement('span', null, el.textContent) // Original text
            ),
            el
        );
    });
}

// Initialize tooltips on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeTooltips);
