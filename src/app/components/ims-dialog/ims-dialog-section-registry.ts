import { Injectable, WritableSignal, computed, signal } from '@angular/core';

export type ImsDialogSection = 'title' | 'content' | 'actions';

@Injectable()
export class ImsDialogSectionRegistry {
  // One counter per section. A single record signal meant every registration
  // rewrote the whole object, so a registering title also invalidated the
  // content and actions computeds and allocated a new record each time.
  private readonly sectionCounts: Record<ImsDialogSection, WritableSignal<number>> = {
    title: signal(0),
    content: signal(0),
    actions: signal(0),
  };

  readonly hasTitle = computed(() => this.sectionCounts.title() > 0);
  readonly hasContent = computed(() => this.sectionCounts.content() > 0);
  readonly hasActions = computed(() => this.sectionCounts.actions() > 0);

  register(section: ImsDialogSection): () => void {
    const count = this.sectionCounts[section];
    count.update((value) => value + 1);

    let registered = true;
    return () => {
      if (!registered) {
        return;
      }

      registered = false;
      count.update((value) => Math.max(0, value - 1));
    };
  }
}
