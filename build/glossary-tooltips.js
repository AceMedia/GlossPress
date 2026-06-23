/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
// Ensure WordPress components and element are available
const {
  render,
  createElement
} = wp.element;
const {
  Tooltip,
  Dashicon
} = wp.components; // Import Dashicon for the info icon


// Function to initialize tooltips
function initializeTooltips() {
  // Select all elements with the 'glossary-highlight' class and a 'data-tooltip' attribute
  document.querySelectorAll('.glossary-highlight[data-tooltip]').forEach(el => {
    const tooltipContent = el.dataset.tooltip;

    // Render a Tooltip component into each matching element
    render(createElement(Tooltip, {
      text: createElement('div',
      // Tooltip content wrapper
      {
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          gap: '6px',
          textAlign: 'left'
        }
      },
      // Layout styling - icon at top-left, text left-aligned
      createElement(Dashicon, {
        icon: 'info-outline',
        style: {
          color: '#007cba',
          marginTop: '2px',
          flexShrink: 0
        }
      }),
      // Info icon at top
      createElement('span', {
        style: {
          textAlign: 'left',
          lineHeight: '1.4'
        }
      }, tooltipContent) // Tooltip text left-aligned
      )
    }, createElement('span', null, el.textContent) // Original text
    ), el);
  });
}

// Initialize tooltips on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeTooltips);
/******/ })()
;