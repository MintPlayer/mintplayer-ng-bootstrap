import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { QrCodeComponent as LibQrCodeComponent } from '@mintplayer/ng-qr-code';

@Component({
  selector: 'demo-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsGridModule, LibQrCodeComponent]
})
export class QrCodeComponent {
  text = 'QR code viewer';
}
