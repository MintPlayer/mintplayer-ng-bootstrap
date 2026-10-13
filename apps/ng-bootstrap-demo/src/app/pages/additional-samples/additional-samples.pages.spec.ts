import type { Type } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';
import { BsAlertCloseComponent, BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import {
  BsFormComponent,
  BsFormControlDirective,
  BsFormGroupDirective,
} from '@mintplayer/ng-bootstrap/form';
import {
  BsColFormLabelDirective,
  BsGridColDirective,
  BsGridColumnDirective,
  BsGridComponent,
  BsGridRowDirective,
} from '@mintplayer/ng-bootstrap/grid';
import {
  BsModalBodyDirective,
  BsModalCloseDirective,
  BsModalComponent,
  BsModalDirective,
  BsModalFooterDirective,
  BsModalHeaderDirective,
  BsModalHostComponent,
} from '@mintplayer/ng-bootstrap/modal';
import { BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';
import { QrCodeComponent as LibQrCodeComponent } from '@mintplayer/ng-qr-code';
import { CollapseComponent } from './collapse/collapse.component';
import { DragDropComponent } from './drag-drop/drag-drop.component';
import { FocusTrapComponent } from './focus-trap/focus-trap.component';
import { QrCodeComponent } from './qr-code/qr-code.component';
import { StepperComponent } from './stepper/stepper.component';

/**
 * The "should create" smoke spec of every additional-samples demo page, one row per page.
 *
 * Each row was its own <page>.component.spec.ts with an identical body; one file
 * per page made vitest pay a fresh jsdom environment and a fresh import of the
 * whole Angular + library graph 5 times for 5 one-line assertions.
 * The rows keep each page's exact TestBed configuration (its mocks and
 * providers), and each still runs in its own describe with a fresh TestBed, so
 * the test names ("<Page>Component > should create") and the coverage are
 * unchanged. A page whose spec does more than this belongs in its own file.
 */
const pages: {
  name: string;
  component: Type<unknown>;
  imports: () => unknown[];
  providers?: () => unknown[];
}[] = [
  {
    name: 'CollapseComponent',
    component: CollapseComponent,
    imports: () => [
      NoopAnimationsModule,
      // Mock dependencies
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsAlertComponent), MockComponent(BsAlertCloseComponent),
      MockDirective(BsButtonTypeDirective),
      MockComponent(BsCodeSnippetComponent),
      // Unit to test (standalone)
      CollapseComponent,
      MockDirective(BsScrollspyDirective),
    ],
  },
  {
    name: 'DragDropComponent',
    component: DragDropComponent,
    imports: () => [
      // Mock dependencies
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockModule(DragDropModule),
      DragDropComponent,
    ],
  },
  {
    name: 'FocusTrapComponent',
    component: FocusTrapComponent,
    imports: () => [
      MockDirective(BsForDirective),
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsModalComponent), MockComponent(BsModalHostComponent), MockDirective(BsModalDirective), MockDirective(BsModalHeaderDirective), MockDirective(BsModalBodyDirective), MockDirective(BsModalFooterDirective), MockDirective(BsModalCloseDirective),
      MockDirective(BsButtonTypeDirective),
      // Unit to test (standalone)
      FocusTrapComponent,
    ],
  },
  {
    name: 'QrCodeComponent',
    component: QrCodeComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(LibQrCodeComponent),
      QrCodeComponent,
    ],
  },
  {
    name: 'StepperComponent',
    component: StepperComponent,
    imports: () => [
      NoopAnimationsModule,
      ReactiveFormsModule,
      MockModule(CdkStepperModule),
      MockComponent(BsGridComponent),
      MockDirective(BsGridRowDirective),
      MockDirective(BsGridColDirective),
      MockDirective(BsGridColumnDirective),
      MockDirective(BsColFormLabelDirective),
      MockComponent(BsAlertComponent),
      MockDirective(BsButtonTypeDirective),
      MockComponent(BsFormComponent),
      MockDirective(BsFormControlDirective),
      StepperComponent,
    ],
  },
];

for (const page of pages) {
  describe(page.name, () => {
    it('should create', async () => {
      await TestBed.configureTestingModule({
        imports: page.imports(),
        providers: page.providers?.() ?? [],
      }).compileComponents();
      const fixture = TestBed.createComponent(page.component);
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
    });
  });
}
