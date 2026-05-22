import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSignaturePadComponent, Signature } from '@mintplayer/ng-bootstrap/signature-pad';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
  imports: [BsCodeSnippetComponent, BsSignaturePadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignaturePadComponent {
  signature: Signature = { strokes: [] };
  onSignatureChange(ev: Signature) {
    console.log('new signature', ev);
  }

  resetSignature() {
    this.signature = { strokes: [] };
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-signature-pad [width]="500"
                      [height]="300"
                      [(signature)]="signature"
                      (signatureChange)="onSignatureChange($event)">
    </bs-signature-pad>

    <button type="button" (click)="resetSignature()">Reset</button>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsSignaturePadComponent, Signature } from '@mintplayer/ng-bootstrap/signature-pad';
    @Component({
      selector: 'my-signature-pad-demo',
      templateUrl: './my-signature-pad-demo.component.html',
      imports: [BsSignaturePadComponent],
    })
    export class MySignaturePadDemoComponent {
      protected signature: Signature = { strokes: [] };

      onSignatureChange(ev: Signature) {
        console.log('new signature', ev);
      }

      resetSignature() {
        this.signature = { strokes: [] };
      }
    }
  `;
}
