import {InjectionToken} from '@angular/core';
import {SpecBuilderConfig} from './spec-builder.types';

/**
 * The blocks, views and settings the builder runs with.
 *
 * Provided by the page from `spec-builder.config.ts`, the one file an
 * environment edits. A test or another page can provide a different one.
 */
export const SPEC_BUILDER_CONFIG = new InjectionToken<SpecBuilderConfig>('SPEC_BUILDER_CONFIG');

