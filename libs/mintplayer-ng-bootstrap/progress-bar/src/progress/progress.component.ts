import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'bs-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss']
})
export class BsProgressComponent {
  // @HostBinding('class.progress') private progressClass = true;
  @Input() @HostBinding('style.height.px') public height: number | null = null;
  @Input() public isIndeterminate = false;

  @HostBinding('class.d-block')
  @HostBinding('class.overflow-hidden')
  private progressClass = true;

}
