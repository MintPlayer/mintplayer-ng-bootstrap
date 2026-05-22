import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { QrCodeComponent as LibQrCodeComponent } from '@mintplayer/ng-qr-code';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, LibQrCodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeComponent {
  text = signal('QR code viewer');

  protected readonly snippetBasicHtml = dedent`
    <input [(ngModel)]="text">

    <qr-code [value]="text()"></qr-code>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { QrCodeComponent } from '@mintplayer/ng-qr-code';
    @Component({
      selector: 'my-qr-code-demo',
      templateUrl: './my-qr-code-demo.component.html',
      imports: [FormsModule, QrCodeComponent],
    })
    export class MyQrCodeDemoComponent {
      protected text = signal('Hello world');
    }
  `;
}
