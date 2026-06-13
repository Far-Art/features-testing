# Shared Assistant Rules

## Sass Selector Nesting

- Use Sass nesting only for true DOM descendants, pseudo-classes, pseudo-elements, attributes, and state scopes.
- Do not use the Sass parent selector to extend or construct class names, such as `&__element`, `&--modifier`, `&-suffix`, `&-active`.
- Write full class names explicitly when targeting related classes, variants, or modifiers.