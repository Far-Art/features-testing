// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const ims = require('./tools/eslint-plugin-ims');

module.exports = defineConfig([
    {
        files: ['**/*.ts'],
        extends: [eslint.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic, angular.configs.tsRecommended],
        processor: angular.processInlineTemplates,
        // angular-eslint's selector and rename rules, changed to accept kebab-case
        // names too: `button[ims-button]`, `ims-button-variation`.
        plugins: { ims },
        rules: {
            // `ims` is the design system's prefix, `app` the demo pages'. The `ims`
            // version accepts kebab-case as well as the style set here.
            'ims/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: ['app', 'ims'],
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: ['app', 'ims'],
                    style: 'kebab-case',
                },
            ],
            '@angular-eslint/no-input-rename': 'off',
            'ims/no-input-rename': 'error',
            '@angular-eslint/no-output-rename': 'off',
            'ims/no-output-rename': 'error',
        },
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
        rules: {
            // The design system's form controls, so a label wrapping one of them is
            // labelling a control.
            '@angular-eslint/template/label-has-associated-control': [
                'error',
                {
                    controlComponents: ['ims-autocomplete', 'ims-autocomplete-async', 'ims-checkbox', 'ims-datepicker', 'ims-radio', 'ims-select'],
                },
            ],
        },
    },
]);
