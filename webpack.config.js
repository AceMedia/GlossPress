const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

// defaultConfig can be an array or object, normalize it
const baseConfig = Array.isArray(defaultConfig) ? defaultConfig[0] : defaultConfig;

const mapSassOptions = (rules = []) =>
    rules.map((rule) => {
        if (rule.oneOf && Array.isArray(rule.oneOf)) {
            return {
                ...rule,
                oneOf: mapSassOptions(rule.oneOf),
            };
        }

        if (!rule.use) {
            return rule;
        }

        const useArray = Array.isArray(rule.use) ? rule.use : [rule.use];
        const transformed = useArray.map((loaderConfig) => {
            if (!loaderConfig || typeof loaderConfig !== 'object') {
                return loaderConfig;
            }

            if (loaderConfig.loader && loaderConfig.loader.includes('sass-loader')) {
                return {
                    ...loaderConfig,
                    options: {
                        ...(loaderConfig.options || {}),
                        sassOptions: {
                            ...((loaderConfig.options && loaderConfig.options.sassOptions) || {}),
                            quietDeps: true,
                            silenceDeprecations: ['legacy-js-api', 'import'],
                        },
                    },
                };
            }

            return loaderConfig;
        });

        return {
            ...rule,
            use: Array.isArray(rule.use) ? transformed : transformed[0],
        };
    });

module.exports = {
    ...baseConfig,
    entry: {
        'glossary-admin': './src/index.js',
        'glossary-frontend': './src/glossary-frontend.js',
        'glossary-tooltips': './src/GlossaryTooltips.js',
        'glossary-block': './src/glossary-block.js'
    },
    output: {
        ...baseConfig.output,
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js'
    },
    optimization: {
        ...baseConfig.optimization,
        minimize: false, // Disable minification to avoid hoisting issues
    },
    module: {
        ...baseConfig.module,
        rules: mapSassOptions(baseConfig.module ? baseConfig.module.rules : []),
    },
    performance: {
        hints: false,
        ...(baseConfig.performance || {}),
    },
    ignoreWarnings: [
        ...(baseConfig.ignoreWarnings || []),
        (warning) =>
            typeof warning === 'string'
                ? warning.includes('@charset must precede all other statements')
                : warning.message && warning.message.includes('@charset must precede all other statements'),
    ],
    plugins: baseConfig.plugins,
};
