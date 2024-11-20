import React from 'react';
import { render } from '@wordpress/element';
import GlossaryFrontend from './GlossaryFrontend';
import './styles/scss/frontend.scss';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('acemedia-glossary-root');
    console.log('DOMContentLoaded event fired. Root:', root);
    if (root) {
        const glossaryData = window.AceMediaGlossaryData || {};
        console.log('Glossary Data:', glossaryData);

        render(<GlossaryFrontend data={glossaryData} />, root);
    }
});
