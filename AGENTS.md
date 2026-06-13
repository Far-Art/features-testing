# Shared Assistant Rules

## Sass Selector Nesting

- Use Sass nesting only for true DOM descendants, pseudo-classes, pseudo-elements, attributes, and state scopes.
- Do not use the Sass parent selector to extend or construct class names, such as `&__element`, `&--modifier`, `&-suffix`, `&-active`.
- Write full class names explicitly when targeting related classes, variants, or modifiers.

## testing

- Do not generate test files unless explicitly asked.
- On refactor / update if the component or service has tests, explicitly ask to update them.