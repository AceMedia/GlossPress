// /src/index.js
import { render } from '@wordpress/element';
import GlossaryAdminApp from './GlossaryAdminApp';

document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('ace-settings-root');
    if (rootElement) {
        render(<GlossaryAdminApp />, rootElement);
    }
});
