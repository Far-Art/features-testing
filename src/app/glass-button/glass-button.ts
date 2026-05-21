import { Component, input } from '@angular/core';

@Component({
  selector: 'app-glass-button',
  imports: [],
  templateUrl: './glass-button.html',
  styleUrl: './glass-button.scss',
})
export class GlassButton {
  readonly label = input('Generate');
  readonly icon = input('&#10023;');
  readonly attentionRequired = input(false);
}
