import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {provideValueAccessor} from '../../shared/basic-value-accessor';
import {IMS_AUTOCOMPLETE_IMPORTS, ImsAutocompleteBase} from './ims-autocomplete-base';
import {ImsAutocompleteOptionInput} from './ims-autocomplete.types';

@Component({
    selector: 'ims-autocomplete',
    standalone: true,
    imports: [IMS_AUTOCOMPLETE_IMPORTS],
    templateUrl: './ims-autocomplete.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideValueAccessor(ImsAutocomplete)],
    host: {
        class: 'ims-autocomplete-host ims-input-host'
    }
})
/**
 * Form-compatible autocomplete over a static option list, filtered and
 * virtualized in the browser. See `ImsAutocompleteBase` for the value contract.
 */
export class ImsAutocomplete<T = unknown> extends ImsAutocompleteBase<T> {
    /**
     * Static options displayed and filtered by the component. A string is both
     * the value and the label of its option.
     */
    readonly options = input<readonly ImsAutocompleteOptionInput<T>[]>([]);

    protected override getSourceOptions(): readonly ImsAutocompleteOptionInput<T>[] {
        return this.options();
    }
}
