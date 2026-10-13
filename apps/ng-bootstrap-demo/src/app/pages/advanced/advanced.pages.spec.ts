import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule, provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withRouterConfig } from '@angular/router';
import { MockComponent, MockDirective, MockModule, MockPipe, MockPipes } from 'ng-mocks';
import { BsAlertCloseComponent, BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import {
  BsFileUploadComponent,
  BsFileUploadTemplateDirective,
} from '@mintplayer/ng-bootstrap/file-upload';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import {
  BsFormComponent,
  BsFormControlDirective,
  BsFormGroupDirective,
} from '@mintplayer/ng-bootstrap/form';
import {
  BsColFormLabelDirective,
  BsGridColumnDirective,
  BsGridComponent,
  BsGridRowDirective,
} from '@mintplayer/ng-bootstrap/grid';
import { BsHasPropertyPipe } from '@mintplayer/ng-bootstrap/has-property';
import {
  BsInstanceofCaseDirective,
  BsInstanceOfDefaultDirective,
  BsInstanceOfDirective,
  BsInstanceofPipe,
} from '@mintplayer/ng-bootstrap/instance-of';
import { BsLinifyPipe } from '@mintplayer/ng-bootstrap/linify';
import {
  BsListGroupComponent,
  BsListGroupItemComponent,
} from '@mintplayer/ng-bootstrap/list-group';
import {
  BsBoldPipe,
  BsItalicPipe,
  BsStrikethroughPipe,
  BsUnderlinePipe,
} from '@mintplayer/ng-bootstrap/markdown';
import { BsNavbarTogglerComponent } from '@mintplayer/ng-bootstrap/navbar-toggler';
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';
import {
  BsOffcanvasComponent,
  BsOffcanvasHostComponent,
  OffcanvasBodyComponent,
  OffcanvasHeaderComponent,
} from '@mintplayer/ng-bootstrap/offcanvas';
import { BsOrdinalNumberPipe } from '@mintplayer/ng-bootstrap/ordinal-number';
import { BsParallaxComponent } from '@mintplayer/ng-bootstrap/parallax';
import { BsPlaylistTogglerComponent } from '@mintplayer/ng-bootstrap/playlist-toggler';
import { BsProgressBarComponent, BsProgressComponent } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsResizableComponent, BsResizeGlyphDirective } from '@mintplayer/ng-bootstrap/resizable';
import { BsScrollspyComponent, BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';
import { BsSignaturePadComponent } from '@mintplayer/ng-bootstrap/signature-pad';
import { BsSlugifyPipe } from '@mintplayer/ng-bootstrap/slugify';
import { BsSplitStringPipe } from '@mintplayer/ng-bootstrap/split-string';
import { BsTrustHtmlPipe } from '@mintplayer/ng-bootstrap/trust-html';
import { BsWordCountPipe } from '@mintplayer/ng-bootstrap/word-count';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import {
  AsyncHostBindingComponent,
  HelloComponent,
  RxjsHostComponent,
} from './async-host-binding/async-host-binding.component';
import { AutofocusComponent } from './autofocus/autofocus.component';
import { CodeSnippetComponent } from './code-snippet/code-snippet.component';
import { CopyComponent } from './copy/copy.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { InstanceOfComponent } from './instance-of/instance-of.component';
import { IsInterfaceComponent } from './is-interface/is-interface.component';
import { LazyLoadedComponent } from './lazy-loading/components/lazy-loaded/lazy-loaded.component';
import { LazyLoadingComponent } from './lazy-loading/lazy-loading.component';
import { MarkdownComponent } from './markdown/markdown.component';
import { ChildAComponent } from './navigation-lock-master-detail/child-a/child-a.component';
import { ChildBComponent } from './navigation-lock-master-detail/child-b/child-b.component';
import {
  NavigationLockMasterDetailComponent,
} from './navigation-lock-master-detail/navigation-lock-master-detail.component';
import { NavigationLockComponent } from './navigation-lock/navigation-lock.component';
import { OrdinalNumberComponent } from './ordinal-number/ordinal-number.component';
import { ParallaxComponent } from './parallax/parallax.component';
import { FontColorComponent } from './pipes/font-color/font-color.component';
import { HasPropertyComponent } from './pipes/has-property/has-property.component';
import { LinifyComponent } from './pipes/linify/linify.component';
import { SlugifyComponent } from './pipes/slugify/slugify.component';
import { SplitStringComponent } from './pipes/split-string/split-string.component';
import { TrustHtmlComponent } from './pipes/trust-html/trust-html.component';
import { WordCountComponent } from './pipes/word-count/word-count.component';
import { ResizableComponent } from './resizable/resizable.component';
import { ScrollspyComponent } from './scrollspy/scrollspy.component';
import { SignaturePadComponent } from './signature-pad/signature-pad.component';
import { ToggleButtonsComponent } from './toggle-buttons/toggle-buttons.component';
import { TrackByComponent } from './track-by/track-by.component';
import { UserAgentComponent } from './user-agent/user-agent.component';

/**
 * The "should create" smoke spec of every advanced demo page, one row per page.
 *
 * Each row was its own <page>.component.spec.ts with an identical body; one file
 * per page made vitest pay a fresh jsdom environment and a fresh import of the
 * whole Angular + library graph 29 times for 29 one-line assertions.
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
    name: 'AsyncHostBindingComponent',
    component: AsyncHostBindingComponent,
    imports: () => [
      NoopAnimationsModule,
      MockComponent(BsAlertComponent), MockComponent(BsAlertCloseComponent),
      MockComponent(BsCodeSnippetComponent),
      MockComponent(HelloComponent),
      MockComponent(RxjsHostComponent),
      AsyncHostBindingComponent,
    ],
  },
  {
    name: 'AutofocusComponent',
    component: AutofocusComponent,
    imports: () => [
      AutofocusComponent
    ],
  },
  {
    name: 'ChildAComponent',
    component: ChildAComponent,
    imports: () => [
      FormsModule,
      MockDirective(BsNavigationLockDirective),
      MockComponent(ConfirmDialogComponent),
      // Unit to test (standalone)
      ChildAComponent,
    ],
    providers: () => [
      provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
    ],
  },
  {
    name: 'ChildBComponent',
    component: ChildBComponent,
    imports: () => [
      // Unit to test (standalone)
      ChildBComponent,
    ],
  },
  {
    name: 'CodeSnippetComponent',
    component: CodeSnippetComponent,
    imports: () => [
      MockComponent(BsCodeSnippetComponent),
      CodeSnippetComponent,
    ],
  },
  {
    name: 'CopyComponent',
    component: CopyComponent,
    imports: () => [
      MockDirective(BsCopyDirective),
      MockComponent(BsOffcanvasComponent), MockComponent(OffcanvasHeaderComponent), MockComponent(OffcanvasBodyComponent), MockComponent(BsOffcanvasHostComponent),
      MockComponent(BsCodeSnippetComponent),
      // Unit to test (standalone)
      CopyComponent,
    ],
  },
  {
    name: 'FileUploadComponent',
    component: FileUploadComponent,
    imports: () => [
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsFileUploadComponent), MockDirective(BsFileUploadTemplateDirective),
      MockComponent(BsProgressComponent), MockComponent(BsProgressBarComponent),
      FileUploadComponent,
    ],
  },
  {
    name: 'FontColorComponent',
    component: FontColorComponent,
    imports: () => [
      FormsModule,
      MockPipe(BsFontColorPipe),
      MockComponent(BsColorPickerComponent),
      FontColorComponent,
    ],
  },
  {
    name: 'HasPropertyComponent',
    component: HasPropertyComponent,
    imports: () => [
      FormsModule,
      MockPipe(BsHasPropertyPipe),
      MockComponent(BsCheckboxComponent),
      MockComponent(BsCodeSnippetComponent),
      HasPropertyComponent,
    ],
  },
  {
    name: 'InstanceOfComponent',
    component: InstanceOfComponent,
    imports: () => [
      MockDirective(BsInstanceOfDirective), MockDirective(BsInstanceofCaseDirective), MockDirective(BsInstanceOfDefaultDirective), MockPipe(BsInstanceofPipe),
      InstanceOfComponent,
    ],
    providers: () => [
      provideNoopAnimations(),
    ],
  },
  {
    name: 'IsInterfaceComponent',
    component: IsInterfaceComponent,
    imports: () => [
      IsInterfaceComponent
    ],
  },
  {
    name: 'LazyLoadedComponent',
    component: LazyLoadedComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      LazyLoadedComponent,
    ],
  },
  {
    name: 'LazyLoadingComponent',
    component: LazyLoadingComponent,
    imports: () => [
      NoopAnimationsModule,
      LazyLoadingComponent,
    ],
  },
  {
    name: 'LinifyComponent',
    component: LinifyComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockPipe(BsLinifyPipe),
      MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
      MockDirective(BsButtonTypeDirective),
      MockComponent(BsCheckboxComponent),
      // Unit to test (standalone)
      LinifyComponent,
    ],
  },
  {
    name: 'MarkdownComponent',
    component: MarkdownComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockPipes(BsBoldPipe, BsItalicPipe, BsStrikethroughPipe, BsUnderlinePipe),
      MarkdownComponent,
    ],
  },
  {
    name: 'NavigationLockComponent',
    component: NavigationLockComponent,
    imports: () => [
      NoopAnimationsModule,
      FormsModule,
      MockComponent(BsCheckboxComponent),
      MockDirective(BsNavigationLockDirective),
      NavigationLockComponent,
    ],
    providers: () => [
      provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
    ],
  },
  {
    name: 'NavigationLockMasterDetailComponent',
    component: NavigationLockMasterDetailComponent,
    imports: () => [
      // Unit to test (standalone)
      NavigationLockMasterDetailComponent,
    ],
    providers: () => [
      provideRouter([]),
    ],
  },
  {
    name: 'OrdinalNumberComponent',
    component: OrdinalNumberComponent,
    imports: () => [
      MockModule(FormsModule),
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockPipe(BsOrdinalNumberPipe),
      OrdinalNumberComponent,
    ],
  },
  {
    name: 'ParallaxComponent',
    component: ParallaxComponent,
    imports: () => [
      ParallaxComponent,
      MockComponent(BsParallaxComponent)
    ],
  },
  {
    name: 'ResizableComponent',
    component: ResizableComponent,
    imports: () => [
      MockComponent(BsResizableComponent), MockDirective(BsResizeGlyphDirective),
      ResizableComponent,
    ],
  },
  {
    name: 'ScrollspyComponent',
    component: ScrollspyComponent,
    imports: () => [
      MockComponent(BsScrollspyComponent), MockDirective(BsScrollspyDirective),
      ScrollspyComponent,
    ],
  },
  {
    name: 'SignaturePadComponent',
    component: SignaturePadComponent,
    imports: () => [
      MockComponent(BsSignaturePadComponent),
      SignaturePadComponent,
    ],
  },
  {
    name: 'SlugifyComponent',
    component: SlugifyComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockPipe(BsSlugifyPipe),
      SlugifyComponent,
    ],
  },
  {
    name: 'SplitStringComponent',
    component: SplitStringComponent,
    imports: () => [
      // Mock dependencies
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
      MockPipe(BsSplitStringPipe),
      // Unit to test (standalone)
      SplitStringComponent,
    ],
  },
  {
    name: 'ToggleButtonsComponent',
    component: ToggleButtonsComponent,
    imports: () => [
      MockComponent(BsPlaylistTogglerComponent),
      MockComponent(BsNavbarTogglerComponent),
      ToggleButtonsComponent,
    ],
  },
  {
    name: 'TrackByComponent',
    component: TrackByComponent,
    imports: () => [
      NoopAnimationsModule,
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
      MockDirective(BsButtonTypeDirective),
      TrackByComponent,
    ],
  },
  {
    name: 'TrustHtmlComponent',
    component: TrustHtmlComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockPipe(BsTrustHtmlPipe),
      TrustHtmlComponent,
    ],
  },
  {
    name: 'UserAgentComponent',
    component: UserAgentComponent,
    imports: () => [
      MockComponent(BsAlertComponent), MockComponent(BsAlertCloseComponent),
      UserAgentComponent,
    ],
  },
  {
    name: 'WordCountComponent',
    component: WordCountComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockPipe(BsWordCountPipe),
      WordCountComponent,
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
