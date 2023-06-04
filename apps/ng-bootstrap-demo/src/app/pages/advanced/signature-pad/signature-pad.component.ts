import { Component } from '@angular/core';
import { Signature } from '@mintplayer/ng-bootstrap/signature-pad';

@Component({
  selector: 'demo-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss']
})
export class SignaturePadComponent {
  signature: Signature = { strokes: [] };
  onSignatureChange(ev: Signature) {
    console.log('new signature', ev);
  }
}
