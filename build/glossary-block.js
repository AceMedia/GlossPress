/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/

;// external ["wp","blocks"]
const external_wp_blocks_namespaceObject = window["wp"]["blocks"];
;// external ["wp","blockEditor"]
const external_wp_blockEditor_namespaceObject = window["wp"]["blockEditor"];
;// external ["wp","components"]
const external_wp_components_namespaceObject = window["wp"]["components"];
;// external ["wp","i18n"]
const external_wp_i18n_namespaceObject = window["wp"]["i18n"];
;// external ["wp","apiFetch"]
const external_wp_apiFetch_namespaceObject = window["wp"]["apiFetch"];
var external_wp_apiFetch_default = /*#__PURE__*/__webpack_require__.n(external_wp_apiFetch_namespaceObject);
;// external ["wp","element"]
const external_wp_element_namespaceObject = window["wp"]["element"];
;// external "ReactJSXRuntime"
const external_ReactJSXRuntime_namespaceObject = window["ReactJSXRuntime"];
;// ./src/glossary-block.js







const STYLE_KEYS = ['textColor', 'headingBackgroundColor', 'headingTextColor', 'cardBackgroundColor', 'contentGap', 'headingPadding'];
const DEFAULT_STYLES = {
  textColor: '',
  headingBackgroundColor: '',
  headingTextColor: '',
  cardBackgroundColor: '',
  contentGap: '1.5rem',
  headingPadding: '1.25rem'
};
const getBlockConfig = () => {
  if (typeof AceMediaGlossaryBlockConfig !== 'undefined') {
    return AceMediaGlossaryBlockConfig;
  }
  return {};
};
const sanitizeSpacingValue = value => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '0') {
    return trimmed === '0' ? '0' : '';
  }
  return /^\d+(?:\.\d+)?(px|rem|em|%)$/i.test(trimmed) ? trimmed : '';
};
const sanitizeColorValue = value => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return '';
  }
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : '';
};
(0,external_wp_blocks_namespaceObject.registerBlockType)('acemedia/glossary', {
  title: (0,external_wp_i18n_namespaceObject.__)('Glossary', 'acemedia-glossary'),
  description: (0,external_wp_i18n_namespaceObject.__)('Display a glossary of terms.', 'acemedia-glossary'),
  category: 'widgets',
  icon: 'book-alt',
  attributes: {
    sort: {
      type: 'string',
      default: 'alphabetical'
    },
    textColor: {
      type: 'string',
      default: ''
    },
    headingBackgroundColor: {
      type: 'string',
      default: ''
    },
    headingTextColor: {
      type: 'string',
      default: ''
    },
    cardBackgroundColor: {
      type: 'string',
      default: ''
    },
    contentGap: {
      type: 'string',
      default: '1.5rem'
    },
    headingPadding: {
      type: 'string',
      default: '1.25rem'
    }
  },
  edit: ({
    attributes,
    setAttributes
  }) => {
    const {
      sort
    } = attributes;
    const config = (0,external_wp_element_namespaceObject.useMemo)(() => getBlockConfig(), []);
    const initialStyles = (0,external_wp_element_namespaceObject.useMemo)(() => ({
      ...DEFAULT_STYLES,
      ...(config.styles || {})
    }), [config.styles]);
    const [globalStyles, setGlobalStyles] = (0,external_wp_element_namespaceObject.useState)(initialStyles);
    const [styleError, setStyleError] = (0,external_wp_element_namespaceObject.useState)(null);
    const [isSavingStyles, setIsSavingStyles] = (0,external_wp_element_namespaceObject.useState)(false);
    const saveTimeoutRef = (0,external_wp_element_namespaceObject.useRef)();
    const latestStylesRef = (0,external_wp_element_namespaceObject.useRef)(initialStyles);
    const restRoot = (0,external_wp_element_namespaceObject.useMemo)(() => {
      if (config.restRoot) {
        return config.restRoot.replace(/\/+$/, '');
      }
      if (typeof window !== 'undefined' && window.wpApiSettings && window.wpApiSettings.root) {
        return window.wpApiSettings.root.replace(/\/+$/, '');
      }
      return '';
    }, [config.restRoot]);
    const buildApiRequest = (0,external_wp_element_namespaceObject.useCallback)((path, extra = {}) => {
      if (!path || typeof path !== 'string') {
        throw new Error('Missing REST path.');
      }
      if (/^https?:\/\//i.test(path)) {
        return {
          url: path,
          ...extra
        };
      }
      const normalized = path.startsWith('/') ? path : `/${path}`;
      if (restRoot) {
        return {
          url: `${restRoot}${normalized}`,
          ...extra
        };
      }
      return {
        path: normalized,
        ...extra
      };
    }, [restRoot]);
    (0,external_wp_element_namespaceObject.useEffect)(() => {
      latestStylesRef.current = globalStyles;
    }, [globalStyles]);
    (0,external_wp_element_namespaceObject.useEffect)(() => {
      if (!config.stylesPath) {
        return;
      }
      external_wp_apiFetch_default()(buildApiRequest(config.stylesPath || '/wp/v2/options/glossary_styles')).then(data => {
        const fetched = {
          ...DEFAULT_STYLES,
          ...(data && data.value || {})
        };
        setGlobalStyles(fetched);
        setStyleError(null);
      }).catch(error => {
        const message = error?.message || (0,external_wp_i18n_namespaceObject.__)('Unable to load shared styles.', 'acemedia-glossary');
        setStyleError(message);
      });
    }, [config.stylesPath]);
    (0,external_wp_element_namespaceObject.useEffect)(() => {
      const updates = {};
      STYLE_KEYS.forEach(key => {
        const nextValue = globalStyles[key] || '';
        if ((attributes[key] || '') !== nextValue) {
          updates[key] = nextValue;
        }
      });
      if (Object.keys(updates).length) {
        setAttributes(updates);
      }
    }, [attributes, globalStyles, setAttributes]);
    (0,external_wp_element_namespaceObject.useEffect)(() => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    }, []);
    const saveStylesToServer = (0,external_wp_element_namespaceObject.useCallback)(stylesToSave => {
      if (!config.canManageOptions) {
        return;
      }
      setIsSavingStyles(true);
      setStyleError(null);
      external_wp_apiFetch_default()(buildApiRequest(config.stylesPath || '/wp/v2/options/glossary_styles', {
        method: 'POST',
        data: {
          value: stylesToSave
        },
        headers: {
          'X-WP-Nonce': config.nonce
        }
      })).then(response => {
        const saved = {
          ...DEFAULT_STYLES,
          ...(response && response.value || stylesToSave)
        };
        setGlobalStyles(saved);
      }).catch(error => {
        const message = error?.message || (0,external_wp_i18n_namespaceObject.__)('Error saving shared styles.', 'acemedia-glossary');
        setStyleError(message);
      }).finally(() => {
        setIsSavingStyles(false);
      });
    }, [config.canManageOptions, config.nonce, config.stylesPath]);
    const queueSaveStyles = (0,external_wp_element_namespaceObject.useCallback)(stylesToSave => {
      if (!config.canManageOptions) {
        return;
      }
      latestStylesRef.current = stylesToSave;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveStylesToServer(latestStylesRef.current);
      }, 400);
    }, [config.canManageOptions, saveStylesToServer]);
    const handleStyleChange = (0,external_wp_element_namespaceObject.useCallback)((key, value) => {
      if (!config.canManageOptions) {
        return;
      }
      setGlobalStyles(prev => {
        const nextValue = key === 'contentGap' || key === 'headingPadding' ? sanitizeSpacingValue(value || '') : sanitizeColorValue(value || '');
        const next = {
          ...prev,
          [key]: nextValue
        };
        queueSaveStyles(next);
        return next;
      });
    }, [config.canManageOptions, queueSaveStyles]);
    const blockProps = (0,external_wp_blockEditor_namespaceObject.useBlockProps)({
      style: {
        '--glossary-text-color': globalStyles.textColor || undefined,
        '--glossary-heading-background': globalStyles.headingBackgroundColor || undefined,
        '--glossary-heading-text-color': globalStyles.headingTextColor || undefined,
        '--glossary-card-background': globalStyles.cardBackgroundColor || undefined,
        '--glossary-content-gap': globalStyles.contentGap || undefined,
        '--glossary-heading-padding': globalStyles.headingPadding || undefined
      }
    });
    const palette = (0,external_wp_element_namespaceObject.useMemo)(() => config.colorPalette || [], [config.colorPalette]);
    const paletteProvided = palette && palette.length > 0;
    return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("div", {
      ...blockProps,
      children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_wp_blockEditor_namespaceObject.InspectorControls, {
        children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.PanelBody, {
          title: (0,external_wp_i18n_namespaceObject.__)('Settings', 'acemedia-glossary'),
          initialOpen: true,
          children: /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.SelectControl, {
            label: (0,external_wp_i18n_namespaceObject.__)('Sort Order', 'acemedia-glossary'),
            value: sort,
            options: [{
              label: (0,external_wp_i18n_namespaceObject.__)('Alphabetical', 'acemedia-glossary'),
              value: 'alphabetical'
            }, {
              label: (0,external_wp_i18n_namespaceObject.__)('Updated', 'acemedia-glossary'),
              value: 'updated'
            }],
            onChange: sort => setAttributes({
              sort
            })
          })
        }), /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_blockEditor_namespaceObject.PanelColorSettings, {
          title: (0,external_wp_i18n_namespaceObject.__)('Colours', 'acemedia-glossary'),
          initialOpen: false,
          colorSettings: [{
            value: globalStyles.textColor,
            colors: paletteProvided ? palette : undefined,
            onChange: value => handleStyleChange('textColor', value || ''),
            label: (0,external_wp_i18n_namespaceObject.__)('Body text colour', 'acemedia-glossary')
          }, {
            value: globalStyles.headingBackgroundColor,
            colors: paletteProvided ? palette : undefined,
            onChange: value => handleStyleChange('headingBackgroundColor', value || ''),
            label: (0,external_wp_i18n_namespaceObject.__)('Heading background', 'acemedia-glossary')
          }, {
            value: globalStyles.headingTextColor,
            colors: paletteProvided ? palette : undefined,
            onChange: value => handleStyleChange('headingTextColor', value || ''),
            label: (0,external_wp_i18n_namespaceObject.__)('Heading text colour', 'acemedia-glossary')
          }, {
            value: globalStyles.cardBackgroundColor,
            colors: paletteProvided ? palette : undefined,
            onChange: value => handleStyleChange('cardBackgroundColor', value || ''),
            label: (0,external_wp_i18n_namespaceObject.__)('Card background', 'acemedia-glossary')
          }]
        }), /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_wp_components_namespaceObject.PanelBody, {
          title: (0,external_wp_i18n_namespaceObject.__)('Layout', 'acemedia-glossary'),
          initialOpen: false,
          children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.__experimentalUnitControl, {
            label: (0,external_wp_i18n_namespaceObject.__)('Gap between entries', 'acemedia-glossary'),
            value: globalStyles.contentGap,
            onChange: value => handleStyleChange('contentGap', value || ''),
            units: [{
              value: 'px',
              label: 'px'
            }, {
              value: 'rem',
              label: 'rem'
            }, {
              value: 'em',
              label: 'em'
            }, {
              value: '%',
              label: '%'
            }]
          }), /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.__experimentalUnitControl, {
            label: (0,external_wp_i18n_namespaceObject.__)('Heading padding', 'acemedia-glossary'),
            value: globalStyles.headingPadding,
            onChange: value => handleStyleChange('headingPadding', value || ''),
            units: [{
              value: 'px',
              label: 'px'
            }, {
              value: 'rem',
              label: 'rem'
            }, {
              value: 'em',
              label: 'em'
            }, {
              value: '%',
              label: '%'
            }]
          }), !config.canManageOptions && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.Notice, {
            status: "info",
            isDismissible: false,
            children: (0,external_wp_i18n_namespaceObject.__)('Styles are centrally managed. Contact an administrator to make changes.', 'acemedia-glossary')
          }), isSavingStyles && config.canManageOptions && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.Notice, {
            status: "info",
            isDismissible: false,
            children: (0,external_wp_i18n_namespaceObject.__)('Saving shared glossary styles...', 'acemedia-glossary')
          }), styleError && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.Notice, {
            status: "warning",
            isDismissible: false,
            children: styleError
          })]
        })]
      }), /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("p", {
        children: (0,external_wp_i18n_namespaceObject.__)('The glossary will be rendered dynamically.', 'acemedia-glossary')
      })]
    });
  },
  save: () => null // Dynamic block; server-side rendering only.
});
/******/ })()
;