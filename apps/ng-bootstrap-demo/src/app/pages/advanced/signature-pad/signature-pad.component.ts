import { DemoFormStateComponent } from '../../../components/form-state/form-state.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSignaturePadComponent, Signature } from '@mintplayer/ng-bootstrap/signature-pad';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, DemoFormStateComponent, BsCodeSnippetComponent, BsSignaturePadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignaturePadComponent {
  /** Angular forms: the same control bound template-driven and reactive. */
  protected readonly formsValue = signal<Signature>({ strokes: [] });
  protected readonly formsControl = new FormControl<Signature>({ strokes: [] }, { nonNullable: true });
  protected readonly formsFormat = (value: Signature) => `${value?.strokes.length ?? 0} stroke(s)`;
  protected readonly snippetFormsHtml = dedent`
    <!-- template-driven (FormsModule) -->
    <bs-signature-pad [width]="300" [height]="150" [(ngModel)]="value"></bs-signature-pad>

    <!-- reactive (ReactiveFormsModule): control = new FormControl(...) -->
    <bs-signature-pad [width]="300" [height]="150" [formControl]="control"></bs-signature-pad>
  `;

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
    import {
      BsSignaturePadComponent,
      Signature,
    } from '@mintplayer/ng-bootstrap/signature-pad';

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
