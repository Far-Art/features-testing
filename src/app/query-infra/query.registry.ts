import {Injectable, InjectionToken, Injector, Provider, inject} from '@angular/core';
import {AnyQueryDefinition} from './query.models';

export const QUERY_DEFINITIONS = new InjectionToken<readonly AnyQueryDefinition[]>(
  'QUERY_DEFINITIONS'
);

@Injectable({providedIn: 'root'})
export class QueryRegistryService {
  private readonly injector = inject(Injector);

  getDefinition(key: string, scopeInjector?: Injector): AnyQueryDefinition {
    const lookupOrder = scopeInjector && scopeInjector !== this.injector
      ? [scopeInjector, this.injector]
      : [this.injector];

    for (const sourceInjector of lookupOrder) {
      const definitions = this.resolveDefinitions(sourceInjector);
      const definition = definitions.find((candidate) => candidate.key === key);
      if (definition) {
        return definition;
      }
    }

    throw new Error(`Query definition "${key}" was not found.`);
  }

  private resolveDefinitions(sourceInjector: Injector | undefined): readonly AnyQueryDefinition[] {
    if (!sourceInjector) {
      return [];
    }
    return sourceInjector.get(QUERY_DEFINITIONS, []);
  }
}

export function provideQueryDefinition(definition: AnyQueryDefinition): Provider {
  return {
    provide: QUERY_DEFINITIONS,
    multi: true,
    useValue: definition
  };
}
