import {NgTemplateOutlet} from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    TemplateRef,
    contentChild,
    effect,
    input,
    model
} from '@angular/core';

let nextCollapsibleId = 0;

@Component({
    selector: 'ims-collapsible-container',
    standalone: true,
    imports: [NgTemplateOutlet],
    templateUrl: './ims-collapsible-container.html',
    styleUrl: './ims-collapsible-container.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsCollapsibleContainer {
    readonly title = input('Details');
    readonly expanded = model(false);
    readonly lazyContent = contentChild(TemplateRef<unknown>, {descendants: false});
    readonly bodyId = `ims-collapsible-container-${nextCollapsibleId++}`;
    readonly renderContent = model(false);

    constructor() {
        effect(() => {
            if (this.expanded()) {
                this.renderContent.set(true);
            }
        });
    }

    toggle(): void {
        this.expanded.update((expanded) => !expanded);
    }

    onBodyTransitionEnd(event: TransitionEvent): void {
        if (event.propertyName !== 'grid-template-rows' || this.expanded()) return;
        this.renderContent.set(false);
    }
}
