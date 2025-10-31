import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ScoopedCircleComponent} from './scooped-circle/scooped-circle';

@Component({
  selector: 'app-root',
    imports: [RouterOutlet, ScoopedCircleComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('features-testing');
}
