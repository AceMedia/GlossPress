<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_Style_Settings {
    const OPTION_KEY = 'acemedia_glossary_block_styles';

    /**
     * Returns the default style values.
     *
     * @return array
     */
    public static function get_default_styles() {
        return array(
            'textColor' => '',
            'headingBackgroundColor' => '',
            'headingTextColor' => '',
            'cardBackgroundColor' => '',
            'contentGap' => '1.5rem',
            'headingPadding' => '1.25rem',
        );
    }

    /**
     * Fetches the stored style settings merged with defaults.
     *
     * @return array
     */
    public static function get_styles() {
        $stored = get_option(self::OPTION_KEY, array());
        if (!is_array($stored)) {
            $stored = array();
        }

        $styles = array_merge(self::get_default_styles(), $stored);
        return self::sanitize_styles($styles, false);
    }

    /**
     * Updates the stored styles with sanitized values.
     *
     * @param array $styles
     * @return void
     */
    public static function update_styles($styles) {
        $sanitized = self::sanitize_styles($styles);
        update_option(self::OPTION_KEY, $sanitized);
    }

    /**
     * Sanitizes incoming style values and optionally enforces defaults.
     *
     * @param array $styles
     * @param bool  $enforce_defaults When true, missing keys are replaced with defaults.
     * @return array
     */
    public static function sanitize_styles($styles, $enforce_defaults = true) {
        $styles = is_array($styles) ? $styles : array();
        $defaults = self::get_default_styles();
        $result = $enforce_defaults ? $defaults : array_merge($defaults, array());

        foreach ($defaults as $key => $default_value) {
            if (!array_key_exists($key, $styles)) {
                if (!$enforce_defaults) {
                    $result[$key] = $default_value;
                }
                continue;
            }

            $value = $styles[$key];

            if (in_array($key, array('textColor', 'headingBackgroundColor', 'headingTextColor', 'cardBackgroundColor'), true)) {
                $result[$key] = self::sanitize_color_value($value);
                continue;
            }

            if (in_array($key, array('contentGap', 'headingPadding'), true)) {
                $result[$key] = self::sanitize_css_unit($value);
                continue;
            }

            $result[$key] = $default_value;
        }

        return $result;
    }

    /**
     * Retrieves the active color palette from the theme/editor configuration.
     *
     * @return array<int, array<string, string>>
     */
    public static function get_color_palette() {
        $palette = array();

        if (function_exists('wp_get_global_settings')) {
            $global_settings = wp_get_global_settings(array('color', 'palette', 'theme')); // theme palette first
            if (is_array($global_settings)) {
                $palette = self::normalize_palette($global_settings);
            }

            if (empty($palette)) {
                $default_palette = wp_get_global_settings(array('color', 'palette', 'default'));
                if (is_array($default_palette)) {
                    $palette = self::normalize_palette($default_palette);
                }
            }
        }

        if (empty($palette)) {
            $theme_support = get_theme_support('editor-color-palette');
            if (is_array($theme_support) && isset($theme_support[0]) && is_array($theme_support[0])) {
                foreach ($theme_support[0] as $color) {
                    if (isset($color['name'], $color['slug'], $color['color'])) {
                        $palette[] = array(
                            'name' => sanitize_text_field($color['name']),
                            'slug' => sanitize_key($color['slug']),
                            'color' => sanitize_hex_color($color['color']),
                        );
                    }
                }
            }
        }

        $palette = array_values(array_filter($palette, static function ($color) {
            return !empty($color['color']);
        }));

        return $palette;
    }

    /**
     * Normalizes palette settings pulled from wp_get_global_settings.
     *
     * @param array $palette
     * @return array
     */
    private static function normalize_palette($palette) {
        $normalized = array();

        foreach ($palette as $color) {
            if (!is_array($color)) {
                continue;
            }

            $value = isset($color['color']) ? self::sanitize_color_value($color['color']) : '';
            if ($value === '') {
                continue;
            }

            $normalized[] = array(
                'name' => isset($color['name']) ? sanitize_text_field($color['name']) : '',
                'slug' => isset($color['slug']) ? sanitize_key($color['slug']) : '',
                'color' => $value,
            );
        }

        return $normalized;
    }

    /**
     * Sanitizes CSS dimension values, allowing px, rem, em, and percentages.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_css_unit($value) {
        $value = is_string($value) ? trim($value) : '';

        if ($value === '') {
            return '';
        }

        if ($value === '0') {
            return '0';
        }

        return preg_match('/^\d+(?:\.\d+)?(px|rem|em|%)$/', $value) ? $value : '';
    }

    /**
     * Sanitizes color values allowing hex codes and WordPress preset variables.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_color_value($value) {
        if (!is_string($value)) {
            return '';
        }

        $value = trim($value);
        if ($value === '') {
            return '';
        }

        $hex = sanitize_hex_color($value);
        if ($hex) {
            return $hex;
        }

        if (preg_match('/^var:preset\|color\|([a-z0-9-]+)$/i', $value, $matches)) {
            $slug = sanitize_key($matches[1]);
            return sprintf('var(--wp--preset--color--%s)', $slug);
        }

        if (preg_match('/^var\(--wp--preset--color--[a-z0-9-]+\)$/i', $value)) {
            return $value;
        }

        return '';
    }
}
