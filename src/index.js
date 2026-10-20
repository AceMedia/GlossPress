// /src/index.js
import { render } from '@wordpress/element';
import GlossaryAdminApp from './GlossaryAdminApp';


const initApp = () => {
    const rootElement = document.getElementById('ace-settings-root');
    if (rootElement) {
        ;
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
