const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        'glossary-admin': './src/index.js',
        'glossary-frontend': './src/glossary-frontend.js'
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js'
    },
    cache: {
        type: 'filesystem',
        cacheDirectory: path.resolve(__dirname, '.webpack-cache'), // Unique cache directory
        buildDependencies: {
            config: [__filename], // Rebuild cache if webpack config changes
        },
    },
    watchOptions: {
        ignored: /node_modules/, // Ignore node_modules to improve watch performance
        aggregateTimeout: 300,   // Delay rebuild after the first change
        poll: 1000,              // Check for changes every second (optional)
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@wordpress/babel-preset-default'],
                    },
                },
            },
            {
                test: /\.(sa|sc|c)ss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader'
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
        }),
    ],
    externals: {
        '@wordpress/blocks': ['wp', 'blocks'],
        '@wordpress/i18n': ['wp', 'i18n'],
        '@wordpress/block-editor': ['wp', 'blockEditor'],
        '@wordpress/components': ['wp', 'components'],
        '@wordpress/element': ['wp', 'element'],
    },
};
