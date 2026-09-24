// @ts-check
// Versions of three angular-eslint rules that accept kebab-case names as well.
//
// Part of the design system's public API is spelled in kebab-case: selectors like
// `button[ims-button]` and input aliases like `ims-button-variation`. angular-eslint
// has no option for that. `directive-selector` takes one naming style per selector
// type, and `no-input-rename` only a list of exact names. So each rule here runs the
// original and drops the reports that a kebab-case name gets.
const angular = require('angular-eslint');

/** @import { RuleContext, RuleDefinition, ViolationReport } from '@eslint/core' */

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;

/**
 * @param {string} name
 * @returns {RuleDefinition}
 */
function angularRule(name) {
    const rule = angular.tsPlugin.rules?.[name];
    if (!rule) throw new Error(`angular-eslint has no rule named ${name}`);
    return rule;
}

/**
 * Creates `rule`'s visitor with its reports sent to `report` instead of ESLint.
 * @param {RuleDefinition} rule
 * @param {RuleContext} context
 * @param {(problem: ViolationReport) => void} report
 * @param {unknown[]} [options] Options to run it with instead of the configured ones.
 */
function createWith(rule, context, report, options = context.options) {
    return rule.create(Object.create(context, { report: { value: report }, options: { value: options } }));
}

/** @param {ViolationReport} problem */
function messageIdOf(problem) {
    return 'messageId' in problem ? problem.messageId : undefined;
}

/**
 * `directive-selector` that passes a selector in the configured style or in
 * kebab-case. Each selector is checked both ways. The kebab-case check only
 * matters when the configured check fails on style alone.
 * @param {RuleDefinition} rule
 * @returns {RuleDefinition}
 */
function eitherSelectorStyle(rule) {
    return {
        ...rule,
        create(context) {
            const [options] = /** @type {[{ style: string }]} */ (context.options);
            /** @type {ViolationReport[]} */
            let kebabCaseProblems = [];
            const asKebabCase = createWith(rule, context, (problem) => kebabCaseProblems.push(problem), [{ ...options, style: 'kebab-case' }]);
            const asConfigured = createWith(rule, context, (problem) => {
                const [kebabCaseProblem] = kebabCaseProblems;
                if (messageIdOf(problem) !== 'styleFailure') {
                    context.report(problem);
                } else if (!kebabCaseProblem) {
                    // Valid kebab-case.
                } else if (messageIdOf(kebabCaseProblem) !== 'styleFailure') {
                    // Kebab-case, but wrong in some other way, such as its prefix.
                    context.report(kebabCaseProblem);
                } else {
                    context.report({ ...problem, data: { style: `${options.style} or kebab-case` } });
                }
            });

            // The kebab-case check visits each node first, so its problems are
            // known by the time the configured check reports.
            return Object.fromEntries(
                Object.entries(asConfigured).map(([selector, visit]) => [
                    selector,
                    /** @param {unknown} node */
                    (node) => {
                        kebabCaseProblems = [];
                        asKebabCase[selector]?.(node);
                        visit?.(node);
                    },
                ]),
            );
        },
    };
}

/**
 * The alias a rename report points at: the string itself, or the part after the
 * colon of an `inputs: ['name: alias']` entry.
 * @param {any} node
 * @returns {string}
 */
function aliasOf(node) {
    const text = node?.type === 'TemplateElement' ? node.value.cooked : node?.value;
    return typeof text === 'string' ? (text.split(':').pop() ?? '').trim() : '';
}

/**
 * `no-input-rename` or `no-output-rename` that passes a kebab-case alias. No class
 * property can have a kebab-case name, so such an input or output has to be aliased.
 * @param {RuleDefinition} rule
 * @returns {RuleDefinition}
 */
function acceptKebabCaseAliases(rule) {
    return {
        ...rule,
        create(context) {
            return createWith(rule, context, (problem) => {
                if (!('node' in problem) || !KEBAB_CASE.test(aliasOf(problem.node))) context.report(problem);
            });
        },
    };
}

module.exports = {
    meta: { name: 'eslint-plugin-ims' },
    rules: {
        'directive-selector': eitherSelectorStyle(angularRule('directive-selector')),
        'no-input-rename': acceptKebabCaseAliases(angularRule('no-input-rename')),
        'no-output-rename': acceptKebabCaseAliases(angularRule('no-output-rename')),
    },
};
