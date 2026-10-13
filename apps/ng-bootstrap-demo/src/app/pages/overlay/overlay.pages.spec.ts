import type { Type } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MockComponent, MockDirective, MockProvider } from 'ng-mocks';
import {
  BsAccordionComponent,
  BsAccordionTabComponent,
  BsAccordionTabHeaderDirective,
} from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import {
  BsDropdownDirective,
  BsDropdownMenuDirective,
  BsDropdownToggleDirective,
} from '@mintplayer/ng-bootstrap/dropdown';
import {
  BsColFormLabelDirective,
  BsGridColumnDirective,
  BsGridComponent,
  BsGridRowDirective,
} from '@mintplayer/ng-bootstrap/grid';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import {
  BsModalBodyDirective,
  BsModalCloseDirective,
  BsModalComponent,
  BsModalDirective,
  BsModalFooterDirective,
  BsModalHeaderDirective,
  BsModalHostComponent,
} from '@mintplayer/ng-bootstrap/modal';
import {
  BsOffcanvasComponent,
  BsOffcanvasHostComponent,
  OffcanvasBodyComponent,
  OffcanvasHeaderComponent,
} from '@mintplayer/ng-bootstrap/offcanvas';
import {
  BsPopoverBodyDirective,
  BsPopoverComponent,
  BsPopoverDirective,
  BsPopoverHeaderDirective,
} from '@mintplayer/ng-bootstrap/popover';
import { BsRadioComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';
import { BsTooltipDirective } from '@mintplayer/ng-bootstrap/tooltip';
import { BsTypeaheadComponent } from '@mintplayer/ng-bootstrap/typeahead';
import { GIT_REPO } from '../../providers/git-repo.provider';
import { TagService } from '../../services/tag/tag.service';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { DropdownComponent } from './dropdown/dropdown.component';
import { ModalComponent } from './modal/modal.component';
import { OffcanvasComponent } from './offcanvas/offcanvas.component';
import { PopoverComponent } from './popover/popover.component';
import { ShellComponent } from './shell/shell.component';
import { TooltipComponent } from './tooltip/tooltip.component';
import { TypeaheadComponent } from './typeahead/typeahead.component';

/**
 * The "should create" smoke spec of every overlay demo page, one row per page.
 *
 * Each row was its own <page>.component.spec.ts with an identical body; one file
 * per page made vitest pay a fresh jsdom environment and a fresh import of the
 * whole Angular + library graph 8 times for 8 one-line assertions.
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
    name: 'ContextMenuComponent',
    component: ContextMenuComponent,
    imports: () => [
      MockComponent(BsHasOverlayComponent),
      ContextMenuComponent,
    ],
  },
  {
    name: 'DropdownComponent',
    component: DropdownComponent,
    imports: () => [
      MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
      MockDirective(BsButtonTypeDirective),
      DropdownComponent,
    ],
  },
  {
    name: 'ModalComponent',
    component: ModalComponent,
    imports: () => [
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsModalComponent), MockComponent(BsModalHostComponent), MockDirective(BsModalDirective), MockDirective(BsModalHeaderDirective), MockDirective(BsModalBodyDirective), MockDirective(BsModalFooterDirective), MockDirective(BsModalCloseDirective),
      MockDirective(BsButtonTypeDirective),
      // Unit to test (standalone)
      ModalComponent,
    ],
    providers: () => [
      { provide: GIT_REPO, useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/apps/ng-bootstrap-demo/src/app/' },
      MockProvider(TagService),
    ],
  },
  {
    name: 'OffcanvasComponent',
    component: OffcanvasComponent,
    imports: () => [
      NoopAnimationsModule,
      RouterTestingModule,
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsOffcanvasComponent), MockComponent(OffcanvasHeaderComponent), MockComponent(OffcanvasBodyComponent), MockComponent(BsOffcanvasHostComponent),
      MockDirective(BsButtonTypeDirective),
      MockComponent(BsButtonGroupComponent),
      // Unit to test (standalone)
      OffcanvasComponent,
    ],
    providers: () => [
      { provide: GIT_REPO, useValue: 'https://github.com' },
    ],
  },
  {
    name: 'PopoverComponent',
    component: PopoverComponent,
    imports: () => [
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsPopoverComponent), MockDirective(BsPopoverDirective), MockDirective(BsPopoverBodyDirective), MockDirective(BsPopoverHeaderDirective),
      MockDirective(BsButtonTypeDirective),
      PopoverComponent,
    ],
  },
  {
    name: 'ShellComponent',
    component: ShellComponent,
    imports: () => [
      NoopAnimationsModule,
      // Unit to test
      ShellComponent,
      // Mock dependencies
      MockComponent(BsAccordionComponent), MockComponent(BsAccordionTabComponent), MockDirective(BsAccordionTabHeaderDirective),
      MockComponent(BsButtonGroupComponent),
      MockDirective(BsButtonTypeDirective),
      MockComponent(BsRadioComponent), MockDirective(BsRadioGroupDirective),
    ],
  },
  {
    name: 'TooltipComponent',
    component: TooltipComponent,
    imports: () => [
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockDirective(BsTooltipDirective),
      MockDirective(BsButtonTypeDirective),
      TooltipComponent,
    ],
    providers: () => [
      { provide: GIT_REPO, useValue: 'https://github.com' }
    ],
  },
  {
    name: 'TypeaheadComponent',
    component: TypeaheadComponent,
    imports: () => [
      MockComponent(BsTypeaheadComponent),
      TypeaheadComponent,
    ],
    providers: () => [
      JsonPipe
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
