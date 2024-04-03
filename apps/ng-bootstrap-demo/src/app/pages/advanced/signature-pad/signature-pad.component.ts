import { Component } from '@angular/core';
import { BsSignaturePadComponent, Signature } from '@mintplayer/ng-bootstrap/signature-pad';

@Component({
  selector: 'demo-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
  standalone: true,
  imports: [BsSignaturePadComponent]
})
export class SignaturePadComponent {
  signature: Signature = { strokes: [] };
  onSignatureChange(ev: Signature) {
    console.log('new signature', ev);
  }
}
