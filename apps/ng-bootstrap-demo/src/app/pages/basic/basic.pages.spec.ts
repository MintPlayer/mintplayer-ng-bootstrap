import type { Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent, MockDirective } from 'ng-mocks';
import { BsAlertCloseComponent, BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';
import {
  BsCardBodyComponent,
  BsCardComponent,
  BsCardFooterComponent,
  BsCardGroupComponent,
  BsCardHeaderComponent,
  BsCardImgComponent,
  BsCardLinkComponent,
  BsCardSubtitleComponent,
  BsCardTextComponent,
  BsCardTitleComponent,
} from '@mintplayer/ng-bootstrap/card';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';
import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';
import { BsFloatingLabelComponent } from '@mintplayer/ng-bootstrap/floating-labels';
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
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import {
  BsListGroupComponent,
  BsListGroupItemComponent,
} from '@mintplayer/ng-bootstrap/list-group';
import { BsMarqueeComponent } from '@mintplayer/ng-bootstrap/marquee';
import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import {
  BsPlaceholderComponent,
  BsPlaceholderFieldDirective,
} from '@mintplayer/ng-bootstrap/placeholder';
import { BsProgressBarComponent, BsProgressComponent } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';
import { BsRatingComponent } from '@mintplayer/ng-bootstrap/rating';
import { BsSpinnerComponent } from '@mintplayer/ng-bootstrap/spinner';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsTimepickerComponent } from '@mintplayer/ng-bootstrap/timepicker';
import { BsTreeSelectComponent } from '@mintplayer/ng-bootstrap/tree-select';
import { BsTreeviewComponent } from '@mintplayer/ng-bootstrap/treeview';
import { AlertComponent } from './alert/alert.component';
import { BadgeComponent } from './badge/badge.component';
import { ButtonGroupComponent } from './button-group/button-group.component';
import { ButtonTypeComponent } from './button-type/button-type.component';
import { CalendarComponent } from './calendar/calendar.component';
import { CloseComponent } from './close/close.component';
import { ColorPickerComponent } from './color-picker/color-picker.component';
import { CardComponent } from './containers/card/card.component';
import { GridComponent } from './containers/grid/grid.component';
import { ForDirectiveComponent } from './for-directive/for-directive.component';
import { DatepickerComponent } from './forms/datepicker/datepicker.component';
import { FloatingLabelsComponent } from './forms/floating-labels/floating-labels.component';
import { InputGroupComponent } from './forms/input-group/input-group.component';
import { MultiRangeComponent } from './forms/multi-range/multi-range.component';
import { RangeComponent } from './forms/range/range.component';
import { TimepickerComponent } from './forms/timepicker/timepicker.component';
import { IconComponent } from './icon/icon.component';
import { ListGroupComponent } from './list-group/list-group.component';
import { MarqueeComponent } from './marquee/marquee.component';
import { PaginationComponent } from './pagination/pagination.component';
import { PlaceholderComponent } from './placeholder/placeholder.component';
import { ProgressBarComponent } from './progress-bar/progress-bar.component';
import { RatingComponent } from './rating/rating.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { TableComponent } from './table/table.component';
import { TreeSelectComponent } from './tree-select/tree-select.component';
import { TreeviewComponent } from './treeview/treeview.component';

/**
 * The "should create" smoke spec of every basic demo page, one row per page.
 *
 * Each row was its own <page>.component.spec.ts with an identical body; one file
 * per page made vitest pay a fresh jsdom environment and a fresh import of the
 * whole Angular + library graph 27 times for 27 one-line assertions.
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
    name: 'AlertComponent',
    component: AlertComponent,
    imports: () => [
      NoopAnimationsModule,
      FormsModule,
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsAlertComponent), MockComponent(BsAlertCloseComponent),
      MockComponent(BsInputGroupComponent),
      MockDirective(BsButtonTypeDirective),
      // Unit to test (standalone)
      AlertComponent,
    ],
  },
  {
    name: 'BadgeComponent',
    component: BadgeComponent,
    imports: () => [
      MockComponent(BsBadgeComponent),
      BadgeComponent,
    ],
  },
  {
    name: 'ButtonGroupComponent',
    component: ButtonGroupComponent,
    imports: () => [
      MockComponent(BsButtonGroupComponent),
      MockDirective(BsButtonTypeDirective),
      ButtonGroupComponent,
    ],
  },
  {
    name: 'ButtonTypeComponent',
    component: ButtonTypeComponent,
    imports: () => [
      MockDirective(BsButtonTypeDirective),
      ButtonTypeComponent,
    ],
  },
  {
    name: 'CalendarComponent',
    component: CalendarComponent,
    imports: () => [
      MockComponent(BsCalendarComponent),
      CalendarComponent,
    ],
  },
  {
    name: 'CardComponent',
    component: CardComponent,
    imports: () => [
      MockComponent(BsCardComponent),
      MockComponent(BsCardHeaderComponent),
      MockComponent(BsCardBodyComponent),
      MockComponent(BsCardFooterComponent),
      MockComponent(BsCardTitleComponent),
      MockComponent(BsCardSubtitleComponent),
      MockComponent(BsCardTextComponent),
      MockComponent(BsCardLinkComponent),
      MockComponent(BsCardImgComponent),
      MockComponent(BsCardGroupComponent),
      MockComponent(BsListGroupComponent),
      MockComponent(BsListGroupItemComponent),
      MockComponent(BsGridComponent),
      MockDirective(BsGridRowDirective),
      MockDirective(BsGridColumnDirective),
      CardComponent,
    ],
  },
  {
    name: 'CloseComponent',
    component: CloseComponent,
    imports: () => [
      MockComponent(BsCloseComponent),
      CloseComponent,
    ],
  },
  {
    name: 'ColorPickerComponent',
    component: ColorPickerComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
      MockComponent(BsColorPickerComponent),
      MockComponent(BsCheckboxComponent),
      MockComponent(BsButtonGroupComponent),
      MockDirective(BsButtonTypeDirective),
      // Unit to test (standalone)
      ColorPickerComponent,
    ],
  },
  {
    name: 'DatepickerComponent',
    component: DatepickerComponent,
    imports: () => [
      MockComponent(BsDatepickerComponent),
      DatepickerComponent,
    ],
  },
  {
    name: 'FloatingLabelsComponent',
    component: FloatingLabelsComponent,
    imports: () => [
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsFloatingLabelComponent),
      FloatingLabelsComponent,
    ],
  },
  {
    name: 'ForDirectiveComponent',
    component: ForDirectiveComponent,
    imports: () => [
      MockDirective(BsForDirective),
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      ForDirectiveComponent,
    ],
  },
  {
    name: 'GridComponent',
    component: GridComponent,
    imports: () => [
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      GridComponent,
    ],
  },
  {
    name: 'IconComponent',
    component: IconComponent,
    imports: () => [
      NoopAnimationsModule,
      MockComponent(BsAlertComponent), MockComponent(BsAlertCloseComponent),
      MockComponent(BsCodeSnippetComponent),
      IconComponent,
    ],
  },
  {
    name: 'InputGroupComponent',
    component: InputGroupComponent,
    imports: () => [
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockDirective(BsButtonTypeDirective),
      MockComponent(BsInputGroupComponent),
      InputGroupComponent,
    ],
  },
  {
    name: 'ListGroupComponent',
    component: ListGroupComponent,
    imports: () => [
      MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
      ListGroupComponent,
    ],
  },
  {
    name: 'MarqueeComponent',
    component: MarqueeComponent,
    imports: () => [
      MockComponent(BsMarqueeComponent),
      MarqueeComponent,
    ],
  },
  {
    name: 'MultiRangeComponent',
    component: MultiRangeComponent,
    imports: () => [
      FormsModule,
      ReactiveFormsModule,
      MockComponent(BsGridComponent),
      MockDirective(BsGridRowDirective),
      MockDirective(BsGridColumnDirective),
      MockDirective(BsGridColDirective),
      MockComponent(BsMultiRangeComponent),
      MockComponent(BsCheckboxComponent),
      MockComponent(BsCodeSnippetComponent),
      MultiRangeComponent,
    ],
  },
  {
    name: 'PaginationComponent',
    component: PaginationComponent,
    imports: () => [
      MockComponent(BsPaginationComponent),
      MockComponent(BsGridComponent),
      MockDirective(BsGridRowDirective),
      MockDirective(BsGridColumnDirective),
      PaginationComponent,
    ],
  },
  {
    name: 'PlaceholderComponent',
    component: PlaceholderComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsCardComponent), MockComponent(BsCardHeaderComponent), MockComponent(BsCardBodyComponent),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsCheckboxComponent),
      MockComponent(BsPlaceholderComponent), MockDirective(BsPlaceholderFieldDirective),
      // Unit to test (standalone)
      PlaceholderComponent,
    ],
  },
  {
    name: 'ProgressBarComponent',
    component: ProgressBarComponent,
    imports: () => [
      MockComponent(BsProgressComponent), MockComponent(BsProgressBarComponent),
      ProgressBarComponent,
    ],
  },
  {
    name: 'RangeComponent',
    component: RangeComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsRangeComponent),
      MockComponent(BsCheckboxComponent),
      RangeComponent,
    ],
  },
  {
    name: 'RatingComponent',
    component: RatingComponent,
    imports: () => [
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsRatingComponent),
      RatingComponent,
    ],
  },
  {
    name: 'SpinnerComponent',
    component: SpinnerComponent,
    imports: () => [
      MockComponent(BsSpinnerComponent),
      SpinnerComponent,
    ],
  },
  {
    name: 'TableComponent',
    component: TableComponent,
    imports: () => [
      FormsModule,
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsTableComponent),
      MockComponent(BsCheckboxComponent),
      TableComponent,
    ],
  },
  {
    name: 'TimepickerComponent',
    component: TimepickerComponent,
    imports: () => [
      MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
      MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
      MockComponent(BsTimepickerComponent),
      TimepickerComponent,
    ],
  },
  {
    name: 'TreeSelectComponent',
    component: TreeSelectComponent,
    imports: () => [
      MockComponent(BsTreeSelectComponent),
      TreeSelectComponent,
    ],
    providers: () => [
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  },
  {
    name: 'TreeviewComponent',
    component: TreeviewComponent,
    imports: () => [
      NoopAnimationsModule,
      MockComponent(BsTreeviewComponent),
      TreeviewComponent,
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
