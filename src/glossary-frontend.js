import React from 'react';
import { render } from '@wordpress/element';
import GlossaryFrontend from './GlossaryFrontend';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('acemedia-glossary-root');
    console.log('DOMContentLoaded event fired. Root:', root);
    if (root) {
        render(<GlossaryFrontend />, root);
    }
});