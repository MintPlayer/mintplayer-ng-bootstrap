import { Component, Input, signal } from '@angular/core';
import { BehaviorSubject, filter, map, Observable } from 'rxjs';
import { Resource, ResourceGroup } from '../../interfaces';
import { ResourceOrGroup } from '../../interfaces/resource-or-group';
import { SchedulerStampWithSlots } from '../../interfaces/scheduler-stamp-with-slots';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'bs-resource-group-presenter',
  templateUrl: './resource-group-presenter.component.html',
  styleUrls: ['./resource-group-presenter.component.scss'],
  standalone: false,
})
export class ResourceGroupPresenterComponent {
  
  constructor(private sanitizer: DomSanitizer) {
    this.data$ = this.resourceOrGroup$
      .pipe(map((resourceOrGroup) => {
        if (!resourceOrGroup) {
          return null;
        } else if ('children' in resourceOrGroup) {
          return <ResourceOrGroup>{
            resource: null,
            resourceGroup: resourceOrGroup
          };
        } else {
          return <ResourceOrGroup>{
            resource: resourceOrGroup,
            resourceGroup: null
          };
        }
      }))
      .pipe(filter((resourceOrGroup) => !!resourceOrGroup))
      .pipe(map((resourceOrGroup) => <ResourceOrGroup>resourceOrGroup));

    this.colSpan$ = this.timeSlots$
      .pipe(map(timeSlots => timeSlots
        .map(timeslot => timeslot.slots.length)
        .reduce((sum, current) => sum + current, 0)
      ));

    import('bootstrap-icons/icons/chevron-down.svg').then((icon) => {
      this.chevronDown.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/chevron-right.svg').then((icon) => {
      this.chevronRight.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
  }

  chevronDown = signal<SafeHtml | undefined>(undefined);
  chevronRight = signal<SafeHtml | undefined>(undefined);
  @Input() level = 0;
  resourceOrGroup$ = new BehaviorSubject<Resource | ResourceGroup | null>(null);
  timeSlots$ = new BehaviorSubject<SchedulerStampWithSlots[]>([]);
  isExpanded$ = new BehaviorSubject<boolean>(false);
  data$: Observable<ResourceOrGroup>;
  colSpan$: Observable<number>;

  //#region resourceOrGroup
  public get resourceOrGroup() {
    return this.resourceOrGroup$.value;
  }
  @Input() public set resourceGroup(value: Resource | ResourceGroup | null) {
    this.resourceOrGroup$.next(value);
  }
  //#endregion

  //#region timeSlots
  public get timeSlots() {
    return this.timeSlots$.value;
  }
  @Input() public set timeSlots(value: SchedulerStampWithSlots[]) {
    this.timeSlots$.next(value);
  }
  //#endregion

  //#region isExpanded
  public get isExpanded() {
    return this.isExpanded$.value;
  }
  @Input() public set isExpanded(value: boolean) {
    this.isExpanded$.next(value);
  }
  //#endregion

  toggleExpanded() {
    this.isExpanded$.next(!this.isExpanded$.value);
  }

}
