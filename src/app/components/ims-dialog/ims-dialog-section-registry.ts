import { Injectable, computed, signal } from '@angular/core';

export type ImsDialogSection = 'title' | 'toolbar' | 'content' | 'actions';

@Injectable()
export class ImsDialogSectionRegistry {
  private readonly sectionCounts = signal<Record<ImsDialogSection, number>>({
    title: 0,
    toolbar: 0,
    content: 0,
    actions: 0,
  });

  readonly hasTitle = computed(() => this.sectionCounts().title > 0);
  readonly hasContent = computed(() => this.sectionCounts().content > 0);
  readonly hasActions = computed(() => this.sectionCounts().actions > 0);

  register(section: ImsDialogSection): () => void {
    this.sectionCounts.update((counts) => ({
      ...counts,
      [section]: counts[section] + 1,
    }));

    let registered = true;
    return () => {
      if (!registered) {
        return;
      }

      registered = false;
      this.sectionCounts.update((counts) => ({
        ...counts,
        [section]: Math.max(0, counts[section] - 1),
      }));
    };
  }
}
