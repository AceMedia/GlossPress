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

        const styleMap = {
            textColor: '--glossary-text-color',
            headingBackgroundColor: '--glossary-heading-background',
            headingTextColor: '--glossary-heading-text-color',
            cardBackgroundColor: '--glossary-card-background',
            contentGap: '--glossary-content-gap',
            headingPadding: '--glossary-heading-padding',
        };

        if (glossaryData.styles) {
            Object.entries(styleMap).forEach(([key, cssVar]) => {
                const value = glossaryData.styles[key];
                if (value) {
                    root.style.setProperty(cssVar, value);
                }
            });
        }

        render(<GlossaryFrontend data={glossaryData} />, root);
    }
});
