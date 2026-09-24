// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
    {
        files: ['**/*.ts'],
        extends: [eslint.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic, angular.configs.tsRecommended],
        processor: angular.processInlineTemplates,
        rules: {
            // `ims` is the design system's prefix, `app` the demo pages'.
            '@angular-eslint/directive-selector': [
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
