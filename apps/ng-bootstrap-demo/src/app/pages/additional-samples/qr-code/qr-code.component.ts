import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { QrCodeComponent as LibQrCodeComponent } from '@mintplayer/ng-qr-code';

@Component({
  selector: 'demo-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, LibQrCodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeComponent {
  text = signal('QR code viewer');
}
