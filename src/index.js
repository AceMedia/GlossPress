// /src/index.js
import { render } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';
import GlossaryAdminApp from './GlossaryAdminApp';

domReady(() => {
    const blocks = window.wp?.blocks;
    if (blocks?.unregisterBlockType && blocks?.getBlockType) {
        ['core/freeform', 'core/classic'].forEach((blockName) => {
            if (blocks.getBlockType(blockName)) {
                blocks.unregisterBlockType(blockName);
            }
        });
    }
});

const initApp = () => {
    const rootElement = document.getElementById('ace-settings-root');
    if (rootElement) {
        console.log('Initializing Glossary Admin App');
        // Render the app
        render(<GlossaryAdminApp />, rootElement);
    } else {
        console.error('Root element #ace-settings-root not found');
    }
};

// Try multiple initialization points
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}
