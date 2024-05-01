import { Directive, HostBinding } from "@angular/core";
import { ObserveSizeDirective } from "@mintplayer/ng-bootstrap/observe-size";

@Directive({
  selector: '[bsPrioNavElement]',
  hostDirectives: [ObserveSizeDirective],
})
export class BsPrioNavElementDirective {
  constructor(private observer: ObserveSizeDirective) {}

  @HostBinding('class.d-inline-block') classList = true;
}
