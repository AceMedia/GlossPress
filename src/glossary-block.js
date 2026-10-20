import { buildRestUrl } from './rest-url';
import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps, PanelColorSettings } from '@wordpress/block-editor';
import {
    Notice,
    PanelBody,
    SelectControl,
    __experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';

const STYLE_KEYS = [
    'textColor',
    'headingBackgroundColor',
    'headingTextColor',
    'cardBackgroundColor',
    'contentGap',
    'headingPadding',
];

const DEFAULT_STYLES = {
    textColor: '',
    headingBackgroundColor: '',
    headingTextColor: '',
    cardBackgroundColor: '',
    contentGap: '1.5rem',
    headingPadding: '1.25rem',
};

const getBlockConfig = () => {
    if (typeof AceMediaGlossaryBlockConfig !== 'undefined') {
        return AceMediaGlossaryBlockConfig;
    }

    return {};
};

const sanitizeSpacingValue = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '0') {
        return trimmed === '0' ? '0' : '';
    }

    return /^\d+(?:\.\d+)?(px|rem|em|%)$/i.test(trimmed) ? trimmed : '';
};

const sanitizeColorValue = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();
    if (trimmed === '') {
        return '';
    }

    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : '';
};

registerBlockType('acemedia/glossary', {
    apiVersion: 3,
    title: __('Glossary', 'acemedia-glossary'),
    description: __('Display a glossary of terms.', 'acemedia-glossary'),
    category: 'widgets',
    icon: 'book-alt',
    attributes: {
        sort: {
            type: 'string',
            default: 'alphabetical',
        },
        textColor: {
            type: 'string',
            default: '',
        },
        headingBackgroundColor: {
            type: 'string',
            default: '',
        },
        headingTextColor: {
            type: 'string',
            default: '',
        },
        cardBackgroundColor: {
            type: 'string',
            default: '',
        },
        contentGap: {
            type: 'string',
            default: '1.5rem',
        },
        headingPadding: {
            type: 'string',
            default: '1.25rem',
        },
    },
    edit: ({ attributes, setAttributes }) => {
        const { sort } = attributes;
        const config = useMemo(() => getBlockConfig(), []);
        const initialStyles = useMemo(
            () => ({
                ...DEFAULT_STYLES,
                ...(config.styles || {}),
            }),
            [config.styles]
        );

        const [globalStyles, setGlobalStyles] = useState(initialStyles);
        const [styleError, setStyleError] = useState(null);
        const [isSavingStyles, setIsSavingStyles] = useState(false);
        const saveTimeoutRef = useRef();
        const latestStylesRef = useRef(initialStyles);
        const restRoot = useMemo(() => {
            if (config.restRoot) {
                return config.restRoot.replace(/\/+$/, '');
            }

            if (typeof window !== 'undefined' && window.wpApiSettings && window.wpApiSettings.root) {
                return window.wpApiSettings.root.replace(/\/+$/, '');
            }

            return '';
        }, [config.restRoot]);

        const buildApiRequest = useCallback(
            (path, extra = {}) => {
                if (!path || typeof path !== 'string') {
                    throw new Error('Missing REST path.');
                }

                if (/^https?:\/\//i.test(path)) {
                    return { url: path, ...extra };
                }

                const normalized = path.startsWith('/') ? path : `/${path}`;

                if (restRoot) {
                    return { url: buildRestUrl(normalized, restRoot), ...extra };
                }

                return { path: normalized, ...extra };
            },
            [restRoot]
        );

        useEffect(() => {
            latestStylesRef.current = globalStyles;
        }, [globalStyles]);

        useEffect(() => {
            if (!config.stylesPath) {
                return;
            }

            apiFetch(buildApiRequest(config.stylesPath || '/wp/v2/options/glossary_styles'))
                .then((data) => {
                    const fetched = {
                        ...DEFAULT_STYLES,
                        ...((data && data.value) || {}),
                    };
                    setGlobalStyles(fetched);
                    setStyleError(null);
                })
                .catch((error) => {
                    const message = error?.message || __('Unable to load shared styles.', 'acemedia-glossary');
                    setStyleError(message);
                });
        }, [config.stylesPath]);

        useEffect(() => {
            const updates = {};
            STYLE_KEYS.forEach((key) => {
                const nextValue = globalStyles[key] || '';
                if ((attributes[key] || '') !== nextValue) {
                    updates[key] = nextValue;
                }
            });

            if (Object.keys(updates).length) {
                setAttributes(updates);
            }
        }, [attributes, globalStyles, setAttributes]);

        useEffect(() => () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        }, []);

        const saveStylesToServer = useCallback(
            (stylesToSave) => {
                if (!config.canManageOptions) {
                    return;
                }

                setIsSavingStyles(true);
                setStyleError(null);

                apiFetch(
                    buildApiRequest(config.stylesPath || '/wp/v2/options/glossary_styles', {
                        method: 'POST',
                        data: { value: stylesToSave },
                        headers: { 'X-WP-Nonce': config.nonce },
                    })
                )
                    .then((response) => {
                        const saved = {
                            ...DEFAULT_STYLES,
                            ...((response && response.value) || stylesToSave),
                        };
                        setGlobalStyles(saved);
                    })
                    .catch((error) => {
                        const message = error?.message || __('Error saving shared styles.', 'acemedia-glossary');
                        setStyleError(message);
                    })
                    .finally(() => {
                        setIsSavingStyles(false);
                    });
            },
            [config.canManageOptions, config.nonce, config.stylesPath]
        );

        const queueSaveStyles = useCallback(
            (stylesToSave) => {
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
            },
            [config.canManageOptions, saveStylesToServer]
        );

        const handleStyleChange = useCallback(
            (key, value) => {
                if (!config.canManageOptions) {
                    return;
                }

                setGlobalStyles((prev) => {
                    const nextValue = key === 'contentGap' || key === 'headingPadding'
                        ? sanitizeSpacingValue(value || '')
                        : sanitizeColorValue(value || '');

                    const next = {
                        ...prev,
                        [key]: nextValue,
                    };

                    queueSaveStyles(next);
                    return next;
                });
            },
            [config.canManageOptions, queueSaveStyles]
        );

        const blockProps = useBlockProps({
            style: {
                '--glossary-text-color': globalStyles.textColor || undefined,
                '--glossary-heading-background': globalStyles.headingBackgroundColor || undefined,
                '--glossary-heading-text-color': globalStyles.headingTextColor || undefined,
                '--glossary-card-background': globalStyles.cardBackgroundColor || undefined,
                '--glossary-content-gap': globalStyles.contentGap || undefined,
                '--glossary-heading-padding': globalStyles.headingPadding || undefined,
            },
        });

        const palette = useMemo(() => config.colorPalette || [], [config.colorPalette]);
        const paletteProvided = palette && palette.length > 0;

        return (
            <div {...blockProps}>
                <InspectorControls>
                    <PanelBody title={__('Settings', 'acemedia-glossary')} initialOpen={true}>
                        <SelectControl
                            label={__('Sort Order', 'acemedia-glossary')}
                            value={sort}
                            options={[
                                { label: __('Alphabetical', 'acemedia-glossary'), value: 'alphabetical' },
                                { label: __('Updated', 'acemedia-glossary'), value: 'updated' },
                            ]}
                            onChange={(sort) => setAttributes({ sort })}
                        />
                    </PanelBody>

                    <PanelColorSettings
                        title={__('Colours', 'acemedia-glossary')}
                        initialOpen={false}
                        colorSettings={[
                            {
                                value: globalStyles.textColor,
                                colors: paletteProvided ? palette : undefined,
                                onChange: (value) => handleStyleChange('textColor', value || ''),
                                label: __('Body text colour', 'acemedia-glossary'),
                            },
                            {
                                value: globalStyles.headingBackgroundColor,
                                colors: paletteProvided ? palette : undefined,
                                onChange: (value) => handleStyleChange('headingBackgroundColor', value || ''),
                                label: __('Heading background', 'acemedia-glossary'),
                            },
                            {
                                value: globalStyles.headingTextColor,
                                colors: paletteProvided ? palette : undefined,
                                onChange: (value) => handleStyleChange('headingTextColor', value || ''),
                                label: __('Heading text colour', 'acemedia-glossary'),
                            },
                            {
                                value: globalStyles.cardBackgroundColor,
                                colors: paletteProvided ? palette : undefined,
                                onChange: (value) => handleStyleChange('cardBackgroundColor', value || ''),
                                label: __('Card background', 'acemedia-glossary'),
                            },
                        ]}
                    />

                    <PanelBody title={__('Layout', 'acemedia-glossary')} initialOpen={false}>
                        <UnitControl
                            label={__('Gap between entries', 'acemedia-glossary')}
                            value={globalStyles.contentGap}
                            onChange={(value) => handleStyleChange('contentGap', value || '')}
                            units={[
                                { value: 'px', label: 'px' },
                                { value: 'rem', label: 'rem' },
                                { value: 'em', label: 'em' },
                                { value: '%', label: '%' },
                            ]}
                        />
                        <UnitControl
                            label={__('Heading padding', 'acemedia-glossary')}
                            value={globalStyles.headingPadding}
                            onChange={(value) => handleStyleChange('headingPadding', value || '')}
                            units={[
                                { value: 'px', label: 'px' },
                                { value: 'rem', label: 'rem' },
                                { value: 'em', label: 'em' },
                                { value: '%', label: '%' },
                            ]}
                        />
                        {!config.canManageOptions && (
                            <Notice status="info" isDismissible={false}>
                                {__('Styles are centrally managed. Contact an administrator to make changes.', 'acemedia-glossary')}
                            </Notice>
                        )}
                        {isSavingStyles && config.canManageOptions && (
                            <Notice status="info" isDismissible={false}>
                                {__('Saving shared glossary styles...', 'acemedia-glossary')}
                            </Notice>
                        )}
                        {styleError && (
                            <Notice status="warning" isDismissible={false}>
                                {styleError}
                            </Notice>
                        )}
                    </PanelBody>
                </InspectorControls>
                <p>{__('The glossary will be rendered dynamically.', 'acemedia-glossary')}</p>
            </div>
        );
    },
    save: () => null, // Dynamic block; server-side rendering only.
});
