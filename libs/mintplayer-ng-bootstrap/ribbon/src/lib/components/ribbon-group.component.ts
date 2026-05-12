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
      [attr.dialog-launcher]="dialogLauncher()"
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
  readonly dialogLauncher = input<string>('');

  readonly dialogLauncherClick = output<{ groupId: string }>();

  onDialogLauncherClick(event: Event): void {
    this.dialogLauncherClick.emit((event as CustomEvent<{ groupId: string }>).detail);
  }
}
