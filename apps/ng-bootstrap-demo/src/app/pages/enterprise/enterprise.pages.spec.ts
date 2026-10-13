import type { Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent, MockDirective } from 'ng-mocks';
import {
  BsAccordionComponent,
  BsAccordionTabComponent,
  BsAccordionTabHeaderDirective,
} from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsSplitterComponent } from '@mintplayer/ng-bootstrap/splitter';
import { ArtistService } from '../../services/artist/artist.service';
import { AccordionComponent } from './accordion/accordion.component';
import { DatatablesComponent } from './datatables/datatables.component';
import { DockComponent } from './dock/dock.component';
import { SplitterComponent } from './splitter/splitter.component';

/**
 * The "should create" smoke spec of every enterprise demo page, one row per page.
 *
 * Each row was its own <page>.component.spec.ts with an identical body; one file
 * per page made vitest pay a fresh jsdom environment and a fresh import of the
 * whole Angular + library graph 4 times for 4 one-line assertions.
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
    name: 'AccordionComponent',
    component: AccordionComponent,
    imports: () => [
      NoopAnimationsModule,
      MockComponent(BsAccordionComponent), MockComponent(BsAccordionTabComponent), MockDirective(BsAccordionTabHeaderDirective),
      AccordionComponent,
    ],
  },
  {
    name: 'DatatablesComponent',
    component: DatatablesComponent,
    imports: () => [
      DatatablesComponent,
    ],
    providers: () => [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ArtistService,
        useValue: {
          pageArtists: () => Promise.resolve({ data: [], count: 0, perPage: 10, page: 1 })
        }
      },
    ],
  },
  {
    name: 'DockComponent',
    component: DockComponent,
    imports: () => [
      DockComponent
    ],
  },
  {
    name: 'SplitterComponent',
    component: SplitterComponent,
    imports: () => [
      FormsModule,
      MockDirective(BsButtonTypeDirective),
      MockComponent(BsCheckboxComponent),
      MockComponent(BsSplitterComponent),
      SplitterComponent,
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
