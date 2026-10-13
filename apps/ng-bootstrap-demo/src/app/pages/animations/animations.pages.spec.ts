import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent, MockDirective } from 'ng-mocks';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import {
  BsColFormLabelDirective,
  BsGridColumnDirective,
  BsGridComponent,
  BsGridRowDirective,
} from '@mintplayer/ng-bootstrap/grid';
import { ColorTransitionComponent } from './color-transition/color-transition.component';
import { FadeInOutComponent } from './fade-in-out/fade-in-out.component';
import { SlideUpDownComponent } from './slide-up-down/slide-up-down.component';

/**
 * The "should create" smoke spec of every animations demo page, one row per page.
 *
 * Each row was its own <page>.component.spec.ts with an identical body; one file
 * per page made vitest pay a fresh jsdom environment and a fresh import of the
 * whole Angular + library graph 3 times for 3 one-line assertions.
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
    name: 'ColorTransitionComponent',
    component: ColorTransitionComponent,
    imports: () => [
      FormsModule,
      NoopAnimationsModule,
      MockComponent(BsCheckboxComponent),
      ColorTransitionComponent,
    ],
  },
  {
    name: 'FadeInOutComponent',
    component: FadeInOutComponent,
    imports: () => [
      MockDirective(BsButtonTypeDirective),
      FadeInOutComponent,
    ],
  },
  {
    name: 'SlideUpDownComponent',
    component: SlideUpDownComponent,
    imports: () => [
      NoopAnimationsModule,
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockDirective(BsButtonTypeDirective),
      SlideUpDownComponent,
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
