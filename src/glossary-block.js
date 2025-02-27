import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

registerBlockType('acemedia/glossary', {
    title: __('Glossary', 'acemedia-glossary'),
    description: __('Display a glossary of terms.', 'acemedia-glossary'),
    category: 'widgets',
    icon: 'book-alt',
    attributes: {
        sort: {
            type: 'string',
            default: 'alphabetical',
        },
    },
    edit: ({ attributes, setAttributes }) => {
        const blockProps = useBlockProps();

        return (
            <div {...blockProps}>
                <InspectorControls>
                    <PanelBody title={__('Settings', 'acemedia-glossary')} initialOpen={true}>
                        <SelectControl
                            label={__('Sort Order', 'acemedia-glossary')}
                            value={attributes.sort}
                            options={[
                                { label: __('Alphabetical', 'acemedia-glossary'), value: 'alphabetical' },
                                { label: __('Updated', 'acemedia-glossary'), value: 'updated' },
                            ]}
                            onChange={(sort) => setAttributes({ sort })}
                        />
                    </PanelBody>
                </InspectorControls>
                <p>{__('The glossary will be rendered dynamically.', 'acemedia-glossary')}</p>
            </div>
        );
    },
    save: () => null, // Dynamic block; server-side rendering only.
});
