import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'bs-ribbon-group',
  template: `
    <mp-ribbon-group
      [attr.group-id]="groupId()"
      [attr.label]="label()"
      [attr.icon]="icon()"
      [attr.dialog-launcher]="dialogLauncher()"
      [attr.priority]="priority()"
      [attr.auto-scale]="autoScale() ? null : 'false'"
      (dialog-launcher-click)="onDialogLauncherClick($event)"
    >
      <ng-content></ng-content>
    </mp-ribbon-group>
  `,
  styles: [`
    :host { display: contents; }
  `],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonGroupComponent {
  readonly groupId = input<string>('');
  readonly label = input<string>('');
  readonly icon = input<string>('');
  readonly dialogLauncher = input<string>('');
  /** Higher priority groups collapse later. Default `0` (DOM-order tiebreaker). */
  readonly priority = input<number>(0);
  /**
   * Opt-out of automatic ReduceOrder collapse. When `false`, this group never
   * collapses to `popup`; the ribbon's narrow layout will scroll horizontally
   * instead. Mirrors Office's `autoScale=false` semantic.
   */
  readonly autoScale = input<boolean>(true);

  readonly dialogLauncherClick = output<{ groupId: string }>();

  onDialogLauncherClick(event: Event): void {
    this.dialogLauncherClick.emit((event as CustomEvent<{ groupId: string }>).detail);
  }
}
