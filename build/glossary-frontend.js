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

;// external "React"
const external_React_namespaceObject = window["React"];
var external_React_default = /*#__PURE__*/__webpack_require__.n(external_React_namespaceObject);
;// external ["wp","element"]
const external_wp_element_namespaceObject = window["wp"]["element"];
;// external ["wp","components"]
const external_wp_components_namespaceObject = window["wp"]["components"];
;// external ["wp","i18n"]
const external_wp_i18n_namespaceObject = window["wp"]["i18n"];
;// ./node_modules/react-responsive-masonry/es/Masonry/index.js
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }




var Masonry_Masonry = /*#__PURE__*/function (_React$Component) {
  _inheritsLoose(Masonry, _React$Component);

  function Masonry() {
    var _this;

    _this = _React$Component.call(this) || this;
    _this.state = {
      columns: [],
      childRefs: [],
      hasDistributed: false
    };
    return _this;
  }

  var _proto = Masonry.prototype;

  _proto.componentDidUpdate = function componentDidUpdate() {
    if (!this.state.hasDistributed && !this.props.sequential) this.distributeChildren();
  };

  Masonry.getDerivedStateFromProps = function getDerivedStateFromProps(props, state) {
    var children = props.children,
        columnsCount = props.columnsCount;
    var hasColumnsChanged = columnsCount !== state.columns.length;
    if (state && children === state.children && !hasColumnsChanged) return null;
    return _extends({}, Masonry.getEqualCountColumns(children, columnsCount), {
      children: children,
      hasDistributed: false
    });
  };

  _proto.shouldComponentUpdate = function shouldComponentUpdate(nextProps) {
    return nextProps.children !== this.state.children || nextProps.columnsCount !== this.props.columnsCount;
  };

  _proto.distributeChildren = function distributeChildren() {
    var _this2 = this;

    var _this$props = this.props,
        children = _this$props.children,
        columnsCount = _this$props.columnsCount;
    var columnHeights = Array(columnsCount).fill(0);
    var isReady = this.state.childRefs.every(function (ref) {
      return ref.current.getBoundingClientRect().height;
    });
    if (!isReady) return;
    var columns = Array.from({
      length: columnsCount
    }, function () {
      return [];
    });
    var validIndex = 0;
    external_React_default().Children.forEach(children, function (child) {
      if (child && external_React_default().isValidElement(child)) {
        // .current is undefined if ref was passed to a functional component without forwardRef
        // now passing ref into a wrapper div so it should always be defined
        var childHeight = _this2.state.childRefs[validIndex].current.getBoundingClientRect().height;

        var minHeightColumnIndex = columnHeights.indexOf(Math.min.apply(Math, columnHeights));
        columnHeights[minHeightColumnIndex] += childHeight;
        columns[minHeightColumnIndex].push(child);
        validIndex++;
      }
    });
    this.setState(function (p) {
      return _extends({}, p, {
        columns: columns,
        hasDistributed: true
      });
    });
  };

  Masonry.getEqualCountColumns = function getEqualCountColumns(children, columnsCount) {
    var columns = Array.from({
      length: columnsCount
    }, function () {
      return [];
    });
    var validIndex = 0;
    var childRefs = [];
    external_React_default().Children.forEach(children, function (child) {
      if (child && external_React_default().isValidElement(child)) {
        var ref = external_React_default().createRef();
        childRefs.push(ref);
        columns[validIndex % columnsCount].push( /*#__PURE__*/external_React_default().createElement("div", {
          style: {
            display: "flex",
            justifyContent: "stretch"
          },
          key: validIndex,
          ref: ref
        }, child) // React.cloneElement(child, {ref}) // cannot attach refs to functional components without forwardRef
        );
        validIndex++;
      }
    });
    return {
      columns: columns,
      childRefs: childRefs
    };
  };

  _proto.renderColumns = function renderColumns() {
    var _this$props2 = this.props,
        gutter = _this$props2.gutter,
        itemTag = _this$props2.itemTag,
        itemStyle = _this$props2.itemStyle;
    return this.state.columns.map(function (column, i) {
      return external_React_default().createElement(itemTag, {
        key: i,
        style: _extends({
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignContent: "stretch",
          flex: 1,
          width: 0,
          gap: gutter
        }, itemStyle)
      }, column.map(function (item) {
        return item;
      }));
    });
  };

  _proto.render = function render() {
    var _this$props3 = this.props,
        gutter = _this$props3.gutter,
        className = _this$props3.className,
        style = _this$props3.style,
        containerTag = _this$props3.containerTag;
    return external_React_default().createElement(containerTag, {
      style: _extends({
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignContent: "stretch",
        boxSizing: "border-box",
        width: "100%",
        gap: gutter
      }, style),
      className: className
    }, this.renderColumns());
  };

  return Masonry;
}((external_React_default()).Component);

Masonry_Masonry.propTypes =  false ? 0 : {};
Masonry_Masonry.defaultProps = {
  columnsCount: 3,
  gutter: "0",
  className: null,
  style: {},
  containerTag: "div",
  itemTag: "div",
  itemStyle: {},
  sequential: false
};
/* harmony default export */ const es_Masonry = ((/* unused pure expression or super */ null && (Masonry_Masonry)));
;// ./node_modules/react-responsive-masonry/es/ResponsiveMasonry/index.js


var DEFAULT_COLUMNS_COUNT = 1;
var DEFAULT_GUTTER = "10px";
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? external_React_namespaceObject.useLayoutEffect : external_React_namespaceObject.useEffect;

var useHasMounted = function useHasMounted() {
  var _useState = (0,external_React_namespaceObject.useState)(false),
      hasMounted = _useState[0],
      setHasMounted = _useState[1];

  useIsomorphicLayoutEffect(function () {
    setHasMounted(true);
  }, []);
  return hasMounted;
};

var useWindowWidth = function useWindowWidth() {
  var hasMounted = useHasMounted();

  var _useState2 = (0,external_React_namespaceObject.useState)(typeof window !== "undefined" ? window.innerWidth : 0),
      width = _useState2[0],
      setWidth = _useState2[1];

  var handleResize = (0,external_React_namespaceObject.useCallback)(function () {
    if (!hasMounted) return;
    setWidth(window.innerWidth);
  }, [hasMounted]);
  useIsomorphicLayoutEffect(function () {
    if (hasMounted) {
      window.addEventListener("resize", handleResize);
      handleResize();
      return function () {
        return window.removeEventListener("resize", handleResize);
      };
    }
  }, [hasMounted, handleResize]);
  return width;
};

var MasonryResponsive = function MasonryResponsive(_ref) {
  var _ref$columnsCountBrea = _ref.columnsCountBreakPoints,
      columnsCountBreakPoints = _ref$columnsCountBrea === void 0 ? {
    350: 1,
    750: 2,
    900: 3
  } : _ref$columnsCountBrea,
      _ref$gutterBreakPoint = _ref.gutterBreakPoints,
      gutterBreakPoints = _ref$gutterBreakPoint === void 0 ? {} : _ref$gutterBreakPoint,
      children = _ref.children,
      _ref$className = _ref.className,
      className = _ref$className === void 0 ? null : _ref$className,
      _ref$style = _ref.style,
      style = _ref$style === void 0 ? null : _ref$style;
  var windowWidth = useWindowWidth();
  var getResponsiveValue = (0,external_React_namespaceObject.useCallback)(function (breakPoints, defaultValue) {
    var sortedBreakPoints = Object.keys(breakPoints).sort(function (a, b) {
      return a - b;
    });
    var value = sortedBreakPoints.length > 0 ? breakPoints[sortedBreakPoints[0]] : defaultValue;
    sortedBreakPoints.forEach(function (breakPoint) {
      if (breakPoint < windowWidth) {
        value = breakPoints[breakPoint];
      }
    });
    return value;
  }, [windowWidth]);
  var columnsCount = (0,external_React_namespaceObject.useMemo)(function () {
    return getResponsiveValue(columnsCountBreakPoints, DEFAULT_COLUMNS_COUNT);
  }, [getResponsiveValue, columnsCountBreakPoints]);
  var gutter = (0,external_React_namespaceObject.useMemo)(function () {
    return getResponsiveValue(gutterBreakPoints, DEFAULT_GUTTER);
  }, [getResponsiveValue, gutterBreakPoints]);
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: className,
    style: style
  }, external_React_default().Children.map(children, function (child, index) {
    return external_React_default().cloneElement(child, {
      key: index,
      columnsCount: columnsCount,
      gutter: gutter
    });
  }));
};

MasonryResponsive.propTypes =  false ? 0 : {};
/* harmony default export */ const ResponsiveMasonry = ((/* unused pure expression or super */ null && (MasonryResponsive)));
;// ./node_modules/react-responsive-masonry/es/index.js


/* harmony default export */ const es = ((/* unused pure expression or super */ null && (Masonry)));

;// external ["wp","apiFetch"]
const external_wp_apiFetch_namespaceObject = window["wp"]["apiFetch"];
;// ./src/utils.js

const getRestRoot = () => {
  if (typeof AceMediaGlossaryAdmin !== 'undefined' && AceMediaGlossaryAdmin.restRoot) {
    return AceMediaGlossaryAdmin.restRoot.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.wpApiSettings?.root) {
    return window.wpApiSettings.root.replace(/\/+$/, '');
  }
  return '/wp-json';
};

/**
 * Decode HTML entities in a string.
 * @param {string} str - String to decode.
 * @returns {string} - Decoded string.
 */
const decodeHTMLEntities = str => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
};

/**
 * Debounce a function call by a given delay.
 * @param {Function} func - Function to debounce.
 * @param {number} delay - Debounce delay in milliseconds.
 * @returns {Function} - Debounced function.
 */
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Smoothly scroll to a specific vertical position.
 * @param {number} targetY - The target vertical position to scroll to.
 * @param {number} [duration=1000] - Duration of the scroll animation in milliseconds.
 */
const smoothScrollTo = (targetY, duration = 1000) => {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();
  const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease-in-out formula

  const step = currentTime => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1); // Clamp progress to 1

    const easedProgress = easeInOutQuad(progress); // Apply easing
    window.scrollTo(0, startY + distance * easedProgress);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
};

/**
 * Generic API fetch utility.
 * @param {string} path - API path to fetch.
 * @param {string} [method='GET'] - HTTP method.
 * @param {object|null} [data=null] - Data to send with the request.
 * @param {object} [headers={}] - Additional headers for the request.
 * @returns {Promise<object>} - Response data.
 */
const fetchFromAPI = async (path, method = 'GET', data = null, headers = {}) => {
  if (typeof path !== 'string' || path.trim() === '') {
    throw new Error('fetchFromAPI requires a valid path.');
  }
  const normalizedPath = (() => {
    if (/^https?:\/\//i.test(path)) {
      return path.trim();
    }
    let prepared = path.trim();
    return prepared.replace(/^\/+/, '').replace(/^wp-json\/?/, '');
  })();
  const baseHeaders = {
    ...headers
  };
  const options = {
    method: method || 'GET'
  };
  if (data !== null && method && method.toUpperCase() !== 'GET') {
    options.body = JSON.stringify(data);
    baseHeaders['Content-Type'] = 'application/json';
  }
  const resolveRestRoot = () => {
    if (typeof AceMediaGlossaryAdmin !== 'undefined' && AceMediaGlossaryAdmin.restRoot) {
      return AceMediaGlossaryAdmin.restRoot.replace(/\/+$/, '');
    }
    if (typeof AceMediaGlossaryBlockConfig !== 'undefined' && AceMediaGlossaryBlockConfig.restRoot) {
      return AceMediaGlossaryBlockConfig.restRoot.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && window.wpApiSettings && window.wpApiSettings.root) {
      return window.wpApiSettings.root.replace(/\/+$/, '');
    }
    return '';
  };
  const restRoot = resolveRestRoot();
  const isAbsoluteUrl = /^https?:\/\//i.test(normalizedPath);
  let requestArgs;
  if (isAbsoluteUrl) {
    requestArgs = {
      url: normalizedPath,
      headers: baseHeaders,
      ...options
    };
  } else if (restRoot) {
    const cleanRoot = restRoot.replace(/\/+$/, '');
    const cleanPath = normalizedPath.replace(/^\/+/, '');
    requestArgs = {
      url: `${cleanRoot}/${cleanPath}`,
      headers: baseHeaders,
      ...options
    };
  } else {
    requestArgs = {
      path: normalizedPath.replace(/^\/+/, ''),
      headers: baseHeaders,
      ...options
    };
  }
  try {
    const response = await apiFetch(requestArgs);
    return response;
  } catch (error) {
    console.error(`Error fetching from API (${normalizedPath}):`, error.message);
    console.error('Full error object:', error);
    throw error;
  }
};

/**
 * Fetch logs via API.
 * @param {Function} setLogs - State setter for logs.
 */
const fetchLogs = async setLogs => {
  try {
    const response = await fetchFromAPI('/wp/v2/logs', 'GET', null, {
      'X-WP-Nonce': AceMediaGlossaryAdmin.nonce
    });
    const fetchedLogs = response.logs || ''; // Extract logs from response object
    setLogs(fetchedLogs); // Update state
  } catch (error) {
    console.error('Error fetching logs:', error);
    setLogs(''); // Clear logs in case of error
  }
};

/**
 * Clear logs via API.
 * @returns {Promise<void>} - Resolves when logs are cleared.
 */
const clearLogs = async () => {
  try {
    const response = await fetchFromAPI('/wp/v2/logs', 'DELETE', null, {
      'X-WP-Nonce': AceMediaGlossaryAdmin.nonce
    });
    if (response?.success || response?.message) {
      console.log('Logs cleared successfully.');
    } else {
      console.warn('Logs cleared (no explicit success message returned).');
    }
  } catch (error) {
    console.error('Error clearing logs:', error.message);
  }
};

/**
 * Save a CSS string via API.
 * @param {string} css - Custom CSS string.
 */
const saveCss = async css => {
  console.log('Saving custom CSS:', css);
  try {
    if (typeof css !== 'string' || css.trim() === '') {
      throw new Error('CSS must be a valid non-empty string.');
    }
    const response = await fetchFromAPI('/wp/v2/save-custom-css', 'POST', {
      css: css.trim()
    }, {
      'X-WP-Nonce': AceMediaGlossaryAdmin.nonce
    });
    if (response?.success) {
      console.log('Custom CSS saved successfully:', response.message);
      return response.message; // Return the success message
    } else {
      console.error('Failed to save CSS:', response?.message || 'Unknown error');
      return response?.message || 'Unknown error'; // Return the error message
    }
  } catch (error) {
    console.error('Error saving custom CSS:', error.message);
    return error.message; // Return the error message
  }
};

/**
 * Fetch a single glossary term with full data.
 * @param {number} termId - The ID of the term to fetch.
 * @returns {Promise<object>} - The full term data.
 */
const fetchSingleTerm = async termId => {
  try {
    const response = await fetchFromAPI(`/wp/v2/glossary/${termId}`);
    return response;
  } catch (error) {
    console.error('Error fetching single term:', error);
    throw error;
  }
};

/**
 * Update related terms for a glossary term.
 * @param {number} termId - The ID of the term to update.
 * @param {Array<number>} relatedTermIds - Array of related term IDs.
 * @param {object} termsLookup - Optional lookup object to get term titles for better messaging.
 * @returns {Promise<object>} - Response data.
 */
const updateRelatedTerms = async (termId, relatedTermIds, termsLookup = {}) => {
  try {
    const response = await fetchFromAPI(`/wp/v2/glossary/${termId}/related`, 'POST', {
      relatedTerms: relatedTermIds
    });

    // Enhanced response with term information for better messaging
    if (termsLookup && Object.keys(termsLookup).length > 0) {
      const currentTermTitle = termsLookup[termId] || `Term ${termId}`;
      const relatedTermTitles = relatedTermIds.map(id => termsLookup[id] || `Term ${id}`);
      response.termInfo = {
        currentTerm: currentTermTitle,
        relatedTerms: relatedTermTitles,
        currentTermId: termId,
        relatedTermIds: relatedTermIds
      };
    }
    return response;
  } catch (error) {
    console.error('Error updating related terms:', error);
    throw error;
  }
};

/**
 * Update categories for a glossary term.
 * @param {number} termId - The ID of the term to update.
 * @param {Array<number>} categoryIds - Array of category IDs.
 * @param {boolean} isAutosave - Whether this is an autosave operation.
 * @returns {Promise<object>} - Response data.
 */
const updateTermCategories = async (termId, categoryIds, isAutosave = false) => {
  try {
    // Use different endpoint for autosave to avoid conflicts
    const endpoint = isAutosave ? `/wp/v2/glossary/${termId}/categories/autosave` : `/wp/v2/glossary/${termId}/categories`;
    const response = await fetchFromAPI(endpoint, 'POST', {
      categories: categoryIds
    });
    return response;
  } catch (error) {
    console.error('Error updating categories:', error);

    // Enhanced error handling with more details
    if (error.data) {
      const enhancedError = new Error(error.data.message || 'Failed to update categories');
      enhancedError.data = error.data;
      enhancedError.status = error.status;
      throw enhancedError;
    }
    throw error;
  }
};

/**
 * Update tags for a glossary term.
 * @param {number} termId - ID of the glossary term.
 * @param {Array} tagIds - Array of tag IDs to associate with the term.
 * @param {boolean} isAutosave - Whether this is an autosave operation.
 * @returns {Promise} - Promise representing the API request.
 */
const updateTermTags = async (termId, tagIds, isAutosave = false) => {
  try {
    // Use different endpoint for autosave to avoid conflicts
    const endpoint = isAutosave ? `/wp/v2/glossary/${termId}/tags/autosave` : `/wp/v2/glossary/${termId}/tags`;
    const response = await fetchFromAPI(endpoint, 'POST', {
      tags: tagIds
    });
    return response;
  } catch (error) {
    console.error('Error updating tags:', error);

    // Enhanced error handling with more details
    if (error.data) {
      const enhancedError = new Error(error.data.message || 'Failed to update tags');
      enhancedError.data = error.data;
      enhancedError.status = error.status;
      throw enhancedError;
    }
    throw error;
  }
};

/**
 * Prefetch initial data for tags and categories to speed up card rendering.
 * @returns {Promise} - Promise representing the API request.
 */
const fetchPrefetchData = async () => {
  try {
    return await fetchFromAPI('/wp/v2/glossary/prefetch-data');
  } catch (error) {
    console.error('Error fetching prefetch data:', error);
    throw error;
  }
};

/**
 * Get related terms lookup data (id -> title mapping) for faster rendering.
 * @returns {Promise} - Promise representing the API request.
 */
const fetchRelatedTermsLookup = async () => {
  try {
    return await fetchFromAPI('/wp/v2/glossary/related-terms-lookup');
  } catch (error) {
    console.error('Error fetching related terms lookup:', error);
    throw error;
  }
};

/**
 * Format relative time from a timestamp.
 * @param {string|number} timestamp - Timestamp to format.
 * @returns {string} - Formatted relative time string.
 */
const formatRelativeTime = timestamp => {
  if (!timestamp) return null;
  const time = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - time) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  for (const [key, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return `${interval} ${key}${interval !== 1 ? 's' : ''} ago`;
    }
  }
  return 'Just now';
};
const setupDragAndDrop = ({
  onFileDrop,
  setIsDragging,
  setMessage,
  clearLogs,
  setIsSaving,
  fetchLogs,
  setLoadTime,
  setTerms,
  setLogs // Include setLogs here
}) => {
  const handleDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };
  const handleDragLeave = e => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = async e => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = async event => {
        try {
          const parsedPayload = JSON.parse(event.target.result);
          let termsArray = [];
          let payloadToSend = parsedPayload;
          if (Array.isArray(parsedPayload)) {
            termsArray = parsedPayload;
          } else if (parsedPayload && typeof parsedPayload === 'object' && Array.isArray(parsedPayload.terms)) {
            termsArray = parsedPayload.terms;
          } else {
            throw new Error('Invalid JSON format. Expected an array of terms or an export payload.');
          }
          setIsSaving(true);
          await clearLogs();
          const startTime = performance.now();
          const response = await onFileDrop(payloadToSend);
          const endTime = performance.now();
          const responseTime = Math.round(endTime - startTime);
          const {
            new_terms = [],
            matched_terms = 0
          } = response;
          const totalTerms = termsArray.length;
          const newTerms = Array.isArray(new_terms) ? new_terms.length : new_terms;
          setMessage(`${newTerms} terms imported successfully in ${responseTime}ms. ${matched_terms} terms already existed.`);
          await fetchLogs(setLogs); // Ensure fetchLogs correctly uses setLogs

          const fetchStartTime = performance.now();
          const updatedTerms = await fetchFromAPI('/wp/v2/glossary');
          const fetchEndTime = performance.now();
          const newLoadTime = Math.round(fetchEndTime - fetchStartTime);
          setLoadTime(newLoadTime);
          setTerms(updatedTerms);
        } catch (error) {
          console.error('Error importing terms:', error);
          setMessage('Error importing terms. Please try again.');
        } finally {
          setIsSaving(false);
          setTimeout(() => setMessage(''), 5000);
        }
      };
      reader.readAsText(file);
    } else {
      setMessage('Please drop a valid JSON file.');
      setTimeout(() => setMessage(''), 5000);
    }
  };
  window.addEventListener('dragover', handleDragOver);
  window.addEventListener('dragleave', handleDragLeave);
  window.addEventListener('drop', handleDrop);
  return () => {
    window.removeEventListener('dragover', handleDragOver);
    window.removeEventListener('dragleave', handleDragLeave);
    window.removeEventListener('drop', handleDrop);
  };
};
;// external "ReactJSXRuntime"
const external_ReactJSXRuntime_namespaceObject = window["ReactJSXRuntime"];
;// ./src/GlossaryFrontend.js






const GlossaryFrontend = ({
  data
}) => {
  const [terms, setTerms] = (0,external_wp_element_namespaceObject.useState)([]);
  const [loading, setLoading] = (0,external_wp_element_namespaceObject.useState)(!data.preloadedTerms || data.preloadedTerms.length === 0);
  const [sortOption, setSortOption] = (0,external_wp_element_namespaceObject.useState)(data.sort || 'alphabetical');
  const [openCardId, setOpenCardId] = (0,external_wp_element_namespaceObject.useState)(null);
  const termRefs = (0,external_wp_element_namespaceObject.useRef)({});
  const [searchQuery, setSearchQuery] = (0,external_wp_element_namespaceObject.useState)(''); // State for search query
  const [suggestions, setSuggestions] = (0,external_wp_element_namespaceObject.useState)([]); // State for search suggestions
  const [showSuggestions, setShowSuggestions] = (0,external_wp_element_namespaceObject.useState)(false); // Control suggestions dropdown
  const searchRef = (0,external_wp_element_namespaceObject.useRef)(null); // Ref for search container

  const generateAnchorId = title => {
    return title.toLowerCase().replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^\w\-]/g, ''); // Remove all non-word characters except dashes
  };
  (0,external_wp_element_namespaceObject.useEffect)(() => {
    if (openCardId && termRefs.current[openCardId]) {
      //   scrollToElement(openCardId);
      window.history.pushState(null, '', `#${openCardId}`);
    }
  }, [openCardId]);
  (0,external_wp_element_namespaceObject.useEffect)(() => {
    if (!loading) {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.substring(1); // Remove the '#' from the hash
        toggleCard(id); // Open the card and scroll to it
      }
    }
  }, [loading]);

  // Handle clicks outside search to close suggestions
  (0,external_wp_element_namespaceObject.useEffect)(() => {
    const handleClickOutside = event => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generate suggestions based on search query
  (0,external_wp_element_namespaceObject.useEffect)(() => {
    if (searchQuery.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const query = searchQuery.toLowerCase();
    const matches = terms.filter(term => term.title.toLowerCase().includes(query) || term.content?.toLowerCase().includes(query)).slice(0, 10) // Limit to 10 suggestions
    .map(term => ({
      id: term.id,
      title: term.title,
      anchorId: generateAnchorId(term.title)
    }));
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [searchQuery, terms]);

  // No longer needed - using CSS sticky positioning instead of JS scroll handling

  const handleSuggestionClick = suggestion => {
    setSearchQuery(suggestion.title);
    setShowSuggestions(false);
    toggleCard(suggestion.title, true);
  };
  const toggleCard = (title, shouldScrollOnly = false) => {
    const id = generateAnchorId(title);
    if (shouldScrollOnly && openCardId === id) {
      scrollToElement(id); // Only scroll if the card is already open
      return;
    }
    setOpenCardId(prevId => {
      if (prevId === id) {
        if (!shouldScrollOnly) return null; // Close card if toggle requested
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToElement(id);
          }, 50);
        });
        return prevId; // Keep it open if only scrolling
      }
      // Open the new card and scroll to it
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToElement(id);
        }, 50);
      });
      return id;
    });
  };
  const escapeCSSSelector = id => {
    return id.replace(/([!"#$%&'()*+,.\/:;<=>?@[\]^`{|}~])/g, '\\$1');
  };
  const calculateHeaderOffset = () => {
    const fixedElementsOffset = Array.from(document.querySelectorAll('header, .fixed, .sticky, #wpadminbar')).reduce((total, el) => {
      const position = window.getComputedStyle(el).position;
      if (position === 'fixed' || position === 'sticky' || el.id === 'wpadminbar') {
        return total + el.getBoundingClientRect().height;
      }
      if (el.tagName.toLowerCase() === 'header') {
        const childHeights = Array.from(el.children).map(child => {
          const childPosition = window.getComputedStyle(child).position;
          if (childPosition === 'fixed' || childPosition === 'sticky') {
            return child.getBoundingClientRect().height;
          }
          return 0;
        });
        const maxChildHeight = Math.max(...childHeights);
        return total + maxChildHeight;
      }
      return total;
    }, 0);

    // Add 2em padding
    const emSize = parseFloat(getComputedStyle(document.documentElement).fontSize) * 2;
    return fixedElementsOffset + emSize;
  };
  const scrollToElement = (id, retries = 5) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = calculateHeaderOffset();
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const middle = absoluteElementTop - headerOffset;
      requestAnimationFrame(() => {
        window.scrollTo({
          top: middle,
          behavior: 'smooth'
        });
      });
      setTimeout(() => {
        const newRect = element.getBoundingClientRect();
        if (newRect.top < 0 || newRect.top > window.innerHeight) {
          window.scrollTo({
            top: middle,
            behavior: 'auto'
          });
        }
      }, 500);
    } else if (retries > 0) {
      setTimeout(() => scrollToElement(id, retries - 1), 100);
    }
  };
  const decodeHTMLEntities = str => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };
  const GlossaryItem = ({
    term,
    isOpen,
    onToggle
  }) => {
    const [relatedPosts, setRelatedPosts] = (0,external_wp_element_namespaceObject.useState)([]);
    const [relatedPostsMeta, setRelatedPostsMeta] = (0,external_wp_element_namespaceObject.useState)(null);
    const [loadingRelatedPosts, setLoadingRelatedPosts] = (0,external_wp_element_namespaceObject.useState)(false);
    const [showAllSeeAlso, setShowAllSeeAlso] = (0,external_wp_element_namespaceObject.useState)(false);
    const anchorId = generateAnchorId(term.title);
    (0,external_wp_element_namespaceObject.useEffect)(() => {
      const fetchRelatedPosts = async () => {
        // Skip fetching if post relations are disabled for this term
        if (!isOpen || !term.enablePostRelations) {
          setRelatedPosts([]);
          setRelatedPostsMeta(null);
          return;
        }
        const categoryIds = term.categories.map(cat => cat.id);
        const tagIds = term.tags.map(tag => tag.id);
        setLoadingRelatedPosts(true);
        try {
          const params = new URLSearchParams();
          params.append('term_id', term.id);
          params.append('search', term.title);
          if (categoryIds.length > 0) params.append('categories', categoryIds.join(','));
          if (tagIds.length > 0) params.append('tags', tagIds.join(','));
          params.append('per_page', 3);
          const restRoot = getRestRoot();
          const response = await fetch(`${restRoot}/wp/v2/related-posts?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }
          const payload = await response.json();
          const postsArray = Array.isArray(payload?.posts) ? payload.posts : Array.isArray(payload) ? payload : [];
          setRelatedPosts(postsArray);
          setRelatedPostsMeta(payload?.meta || null);
        } catch (error) {
          console.error('Error fetching related posts:', error);
          setRelatedPosts([]);
          setRelatedPostsMeta(null);
        } finally {
          setLoadingRelatedPosts(false);
        }
      };
      fetchRelatedPosts();
    }, [isOpen, term.categories, term.tags, term.id, term.title]);
    (0,external_wp_element_namespaceObject.useEffect)(() => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "name": term.title,
        "description": term.content ? term.content.replace(/<[^>]*>?/gm, '').slice(0, 150) : "No description available.",
        "url": window.location.origin + `#term-${term.id}`
      });
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }, [term]);
    return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_wp_components_namespaceObject.Card, {
      className: "glossary-item-card",
      ref: el => termRefs.current[anchorId] = el,
      style: {
        backgroundColor: 'none'
      },
      id: anchorId,
      children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.CardHeader, {
        onClick: e => {
          e.preventDefault();
          e.stopPropagation();

          // Toggle the card
          onToggle(term.title);

          // Then attempt scroll after a brief delay
          requestAnimationFrame(() => {
            setTimeout(() => {
              scrollToElement(generateAnchorId(term.title));
            }, 50);
          });
        },
        style: {
          cursor: 'pointer',
          fontWeight: 'bold'
        },
        children: /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("h4", {
          children: term.title
        })
      }), isOpen && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_wp_components_namespaceObject.CardBody, {
        children: [term.content ? /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("div", {
          dangerouslySetInnerHTML: {
            __html: term.content
          }
        }) : /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("p", {
          children: (0,external_wp_i18n_namespaceObject.__)('No content available.', 'acemedia-glossary')
        }), term.relatedTerms.length > 0 && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("div", {
          className: "see-also",
          children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("strong", {
            children: [(0,external_wp_i18n_namespaceObject.__)('See Also:', 'acemedia-glossary'), ' ']
          }), term.relatedTerms.slice(0, showAllSeeAlso ? term.relatedTerms.length : 10).map((relatedId, index, array) => {
            const relatedTerm = terms.find(t => t.id === relatedId);
            const relatedAnchorId = relatedTerm ? generateAnchorId(relatedTerm.title) : null;
            const termTitle = relatedTerm ? relatedTerm.title : (0,external_wp_i18n_namespaceObject.__)('Unknown Term', 'acemedia-glossary');
            const isLast = index === array.length - 1;
            const isSecondLast = index === array.length - 2;
            return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("span", {
              children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("a", {
                href: `#${relatedAnchorId}`,
                onClick: e => {
                  e.preventDefault();
                  e.stopPropagation();

                  // Toggle the card
                  onToggle(relatedTerm.title);

                  // Then attempt scroll after a brief delay
                  requestAnimationFrame(() => {
                    setTimeout(() => {
                      scrollToElement(generateAnchorId(relatedTerm.title));
                    }, 50);
                  });
                },
                children: termTitle
              }, relatedId), !isLast && (isSecondLast ? ' & ' : ', ')]
            }, relatedId);
          }), term.relatedTerms.length > 10 && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("span", {
            children: [!showAllSeeAlso && ', ', /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("a", {
              href: "#",
              onClick: e => {
                e.preventDefault();
                e.stopPropagation();
                setShowAllSeeAlso(!showAllSeeAlso);
              },
              style: {
                fontWeight: 'bold',
                textDecoration: 'underline',
                cursor: 'pointer'
              },
              children: showAllSeeAlso ? (0,external_wp_i18n_namespaceObject.__)('Show less', 'acemedia-glossary') : `${(0,external_wp_i18n_namespaceObject.__)('See more', 'acemedia-glossary')} (${term.relatedTerms.length - 10})`
            })]
          })]
        }), (term.categories.length > 0 || term.tags.length > 0) && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("div", {
          className: "categories-tags",
          children: [term.categories.length > 0 && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_ReactJSXRuntime_namespaceObject.Fragment, {
            children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("strong", {
              children: [(0,external_wp_i18n_namespaceObject.__)('Categories:', 'acemedia-glossary'), ' ']
            }), term.categories.map((category, index) => {
              const isLast = index === term.categories.length - 1;
              const isSecondLast = index === term.categories.length - 2;
              return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_ReactJSXRuntime_namespaceObject.Fragment, {
                children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("a", {
                  href: `/category/${category.slug}`,
                  children: category.title
                }, category.id), !isLast && (isSecondLast ? ' & ' : ', ')]
              });
            })]
          }), term.tags.length > 0 && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_ReactJSXRuntime_namespaceObject.Fragment, {
            children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("strong", {
              children: [' ', (0,external_wp_i18n_namespaceObject.__)('Tags:', 'acemedia-glossary'), ' ']
            }), term.tags.map((tag, index) => {
              const isLast = index === term.tags.length - 1;
              const isSecondLast = index === term.tags.length - 2;
              return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_ReactJSXRuntime_namespaceObject.Fragment, {
                children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("a", {
                  href: `/tag/${tag.slug}`,
                  children: tag.title
                }, tag.id), !isLast && (isSecondLast ? ' & ' : ', ')]
              });
            })]
          })]
        }), term.enablePostRelations && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("div", {
          className: "related-posts",
          children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("strong", {
            children: [(0,external_wp_i18n_namespaceObject.__)('Related Posts:', 'acemedia-glossary'), ' ']
          }), loadingRelatedPosts ? /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("span", {
            children: (0,external_wp_i18n_namespaceObject.__)('Loading...', 'acemedia-glossary')
          }) : relatedPosts.length > 0 ? relatedPosts.map((post, index) => {
            const isLast = index === relatedPosts.length - 1;
            const isSecondLast = index === relatedPosts.length - 2;
            return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_wp_element_namespaceObject.Fragment, {
              children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("a", {
                href: post.link,
                target: "_blank",
                rel: "noopener noreferrer",
                children: post.title
              }), !isLast && (isSecondLast ? ' & ' : ', ')]
            }, post.id);
          }) : /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("span", {
            children: (0,external_wp_i18n_namespaceObject.__)('No related posts found.', 'acemedia-glossary')
          }), relatedPostsMeta && relatedPosts.length === 0 && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("div", {
            className: "related-posts-meta",
            children: [relatedPostsMeta.search_term && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("small", {
              children: [(0,external_wp_i18n_namespaceObject.__)('Search term:', 'acemedia-glossary'), ' ', /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("code", {
                children: relatedPostsMeta.search_term
              })]
            }), relatedPostsMeta.used_fallback && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("small", {
              children: (0,external_wp_i18n_namespaceObject.__)('Showing fallback results based on shared categories/tags.', 'acemedia-glossary')
            })]
          })]
        })]
      })]
    }, anchorId);
  };
  const fetchTerms = async () => {
    setLoading(true);
    try {
      const response = await fetch(AceMediaGlossaryData.restUrl, {
        headers: {
          'X-WP-Nonce': AceMediaGlossaryData.nonce
        }
      });
      const data = await response.json();
      setTerms(data.map(term => ({
        id: term.id || '',
        title: decodeHTMLEntities(term.title || (0,external_wp_i18n_namespaceObject.__)('Untitled', 'acemedia-glossary')),
        content: decodeHTMLEntities(term.content || ''),
        modified: term.modified || null,
        relatedTerms: term.relatedTerms || [],
        categories: term.categories || [],
        tags: term.tags || [],
        enablePostRelations: term.enablePostRelations || false
      })));
    } catch (error) {
      console.error('Error fetching glossary terms:', error);
    } finally {
      setLoading(false);
    }
  };
  (0,external_wp_element_namespaceObject.useEffect)(() => {
    if (data.preloadedTerms && data.preloadedTerms.length > 0) {
      // Use preloaded terms data (no AJAX request needed)
      setTerms(data.preloadedTerms.map(term => ({
        id: term.id || '',
        title: decodeHTMLEntities(term.title || (0,external_wp_i18n_namespaceObject.__)('Untitled', 'acemedia-glossary')),
        content: decodeHTMLEntities(term.content || ''),
        modified: term.modified || null,
        relatedTerms: term.relatedTerms || [],
        categories: term.categories || [],
        tags: term.tags || [],
        enablePostRelations: term.enablePostRelations || false
      })));
      setLoading(false);
    } else {
      // Fallback to AJAX request if no preloaded data
      fetchTerms();
    }
  }, [data]);

  // Filter terms based on search query
  const filteredTerms = (0,external_wp_element_namespaceObject.useMemo)(() => {
    if (!searchQuery) return terms;
    const lowercasedQuery = searchQuery.toLowerCase();
    return terms.filter(term => term.title && term.title.toLowerCase().includes(lowercasedQuery) || term.content && term.content.toLowerCase().includes(lowercasedQuery));
  }, [terms, searchQuery]);
  const sortedTerms = (0,external_wp_element_namespaceObject.useMemo)(() => {
    return [...filteredTerms].sort((a, b) => {
      if (sortOption === 'alphabetical') return a.title.localeCompare(b.title, undefined, {
        numeric: true
      });
      if (sortOption === 'updated') return new Date(b.modified || 0) - new Date(a.modified || 0);
      return 0;
    });
  }, [filteredTerms, sortOption]); // Use filteredTerms here

  const groupedTerms = (0,external_wp_element_namespaceObject.useMemo)(() => {
    if (!terms.length) return {};
    // Use sortedTerms instead of terms to maintain consistent order
    return sortedTerms.reduce((groups, term) => {
      const firstChar = term.title.charAt(0).toUpperCase();
      if (!groups[firstChar]) groups[firstChar] = [];
      groups[firstChar].push(term);
      return groups;
    }, {});
  }, [sortedTerms]);
  const sortedGroupKeys = (0,external_wp_element_namespaceObject.useMemo)(() => {
    const keys = Object.keys(groupedTerms);
    return keys.sort((a, b) => {
      const isANumber = /^\d$/.test(a);
      const isBNumber = /^\d$/.test(b);
      if (isANumber && !isBNumber) return -1; // Numbers before letters
      if (!isANumber && isBNumber) return 1; // Letters after numbers

      return a.localeCompare(b, undefined, {
        numeric: true
      });
    });
  }, [groupedTerms]);
  return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("div", {
    className: "acemedia-glossary-frontend",
    children: loading ? /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("div", {
      className: "loading-spinner",
      children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.Spinner, {}), /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("p", {
        children: (0,external_wp_i18n_namespaceObject.__)('Loading glossary...', 'acemedia-glossary')
      })]
    }) : terms.length > 0 ? /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)(external_ReactJSXRuntime_namespaceObject.Fragment, {
      children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("div", {
        className: "glossary-search",
        ref: searchRef,
        children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.TextControl, {
          label: (0,external_wp_i18n_namespaceObject.__)('Search Terms', 'acemedia-glossary'),
          value: searchQuery,
          onChange: value => setSearchQuery(value),
          placeholder: (0,external_wp_i18n_namespaceObject.__)('Type to search...', 'acemedia-glossary'),
          onFocus: () => searchQuery && suggestions.length > 0 && setShowSuggestions(true),
          autoComplete: "off",
          autoCorrect: "off",
          autoCapitalize: "off",
          spellCheck: "false"
        }), searchQuery && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("button", {
          className: "glossary-search-clear",
          onClick: () => {
            setSearchQuery('');
            setSuggestions([]);
            setShowSuggestions(false);
          },
          "aria-label": (0,external_wp_i18n_namespaceObject.__)('Clear search', 'acemedia-glossary'),
          title: (0,external_wp_i18n_namespaceObject.__)('Clear search', 'acemedia-glossary'),
          children: "\xD7"
        }), showSuggestions && suggestions.length > 0 && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("ul", {
          className: "glossary-search-suggestions",
          children: suggestions.map(suggestion => /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("li", {
            onClick: () => handleSuggestionClick(suggestion),
            className: "glossary-search-suggestion-item",
            children: suggestion.title
          }, suggestion.id))
        })]
      }), !searchQuery && /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("div", {
        className: "glossary-alphanumeric-index",
        children: /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.Flex, {
          className: "alphanumeric-links",
          justify: "start",
          align: "center",
          wrap: true,
          gap: "0.5em",
          children: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => {
            // Only render if this letter has terms
            if (!groupedTerms[char]) return null;
            return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(external_wp_components_namespaceObject.FlexItem, {
              children: /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("a", {
                href: `#${generateAnchorId(char)}`,
                onClick: e => {
                  e.preventDefault();
                  const group = groupedTerms[char];
                  if (group && group[0]) {
                    toggleCard(group[0].title, true);
                  }
                },
                className: "alphanumeric-link",
                title: `${groupedTerms[char].length} term${groupedTerms[char].length !== 1 ? 's' : ''}`,
                children: [char, /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("span", {
                  className: "alphanumeric-count",
                  children: groupedTerms[char].length
                })]
              })
            }, char);
          })
        })
      }), /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("div", {
        className: "glossary-terms",
        children: Object.keys(groupedTerms).map(key => {
          // Filter terms dynamically based on the search query
          const filteredGroupTerms = groupedTerms[key].filter(term => term.title.toLowerCase().includes(searchQuery.toLowerCase()) || term.content?.toLowerCase().includes(searchQuery.toLowerCase()));

          // Skip rendering the group if no terms match the search query
          if (filteredGroupTerms.length === 0) return null;
          return /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsxs)("div", {
            className: "glossary-section",
            id: `group-${key}`,
            children: [/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("h3", {
              children: key
            }), /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("div", {
              className: "glossary-group",
              children: filteredGroupTerms.map(term => /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(GlossaryItem, {
                term: term,
                isOpen: openCardId === generateAnchorId(term.title),
                onToggle: toggleCard
              }, generateAnchorId(term.title)))
            })]
          }, key);
        })
      })]
    }) : /*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)("p", {
      children: (0,external_wp_i18n_namespaceObject.__)('No glossary terms found.', 'acemedia-glossary')
    })
  });
};
/* harmony default export */ const src_GlossaryFrontend = (GlossaryFrontend);
;// ./src/glossary-frontend.js





document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('acemedia-glossary-root');
  console.log('DOMContentLoaded event fired. Root:', root);
  if (root) {
    const glossaryData = window.AceMediaGlossaryData || {};
    console.log('Glossary Data:', glossaryData);
    const styleMap = {
      textColor: '--glossary-text-color',
      headingBackgroundColor: '--glossary-heading-background',
      headingTextColor: '--glossary-heading-text-color',
      cardBackgroundColor: '--glossary-card-background',
      contentGap: '--glossary-content-gap',
      headingPadding: '--glossary-heading-padding'
    };
    if (glossaryData.styles) {
      Object.entries(styleMap).forEach(([key, cssVar]) => {
        const value = glossaryData.styles[key];
        if (value) {
          root.style.setProperty(cssVar, value);
        }
      });
    }
    (0,external_wp_element_namespaceObject.render)(/*#__PURE__*/(0,external_ReactJSXRuntime_namespaceObject.jsx)(src_GlossaryFrontend, {
      data: glossaryData
    }), root);
  }
});
/******/ })()
;