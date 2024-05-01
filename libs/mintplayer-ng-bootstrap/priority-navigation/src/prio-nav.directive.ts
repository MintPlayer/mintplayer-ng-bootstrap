import { Directive } from "@angular/core";
import { ObserveSizeDirective } from "@mintplayer/ng-bootstrap/observe-size";

@Directive({
  selector: '[bsPrioNav]',
  hostDirectives: [ObserveSizeDirective],
})
export class BsPrioNavDirective {
  constructor(private observer: ObserveSizeDirective) {}
}
