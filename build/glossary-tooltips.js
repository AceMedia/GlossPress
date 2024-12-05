/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/GlossaryTooltips.js":
/*!*********************************!*\
  !*** ./src/GlossaryTooltips.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _styles_scss_tooltips_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./styles/scss/tooltips.scss */ \"./src/styles/scss/tooltips.scss\");\n// Ensure WordPress components and element are available\nvar _wp$element = wp.element,\n  render = _wp$element.render,\n  createElement = _wp$element.createElement;\nvar _wp$components = wp.components,\n  Tooltip = _wp$components.Tooltip,\n  Dashicon = _wp$components.Dashicon; // Import Dashicon for the info icon\n\n\n// Function to initialize tooltips\nfunction initializeTooltips() {\n  // Select all elements with the 'highlight' class and a 'data-tooltip' attribute\n  document.querySelectorAll('.highlight[data-tooltip]').forEach(function (el) {\n    var tooltipContent = el.dataset.tooltip;\n\n    // Render a Tooltip component into each matching element\n    render(createElement(Tooltip, {\n      text: createElement('div',\n      // Tooltip content wrapper\n      {\n        style: {\n          display: 'flex',\n          alignItems: 'center',\n          gap: '6px'\n        }\n      },\n      // Layout styling\n      createElement(Dashicon, {\n        icon: 'info-outline',\n        style: {\n          color: '#007cba'\n        }\n      }),\n      // Info icon\n      createElement('span', null, tooltipContent) // Tooltip text\n      )\n    }, createElement('span', null, el.textContent) // Original text\n    ), el);\n  });\n}\n\n// Initialize tooltips on DOMContentLoaded\ndocument.addEventListener('DOMContentLoaded', initializeTooltips);\n\n//# sourceURL=webpack://ace-glossary-plugin/./src/GlossaryTooltips.js?");

/***/ }),

/***/ "./src/styles/scss/tooltips.scss":
/*!***************************************!*\
  !*** ./src/styles/scss/tooltips.scss ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n// extracted by mini-css-extract-plugin\n\n\n//# sourceURL=webpack://ace-glossary-plugin/./src/styles/scss/tooltips.scss?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/GlossaryTooltips.js");
/******/ 	
/******/ })()
;