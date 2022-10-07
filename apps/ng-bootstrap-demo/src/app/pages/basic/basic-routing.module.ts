import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full', canActivate: [() => false] },
  { path: 'toggle-button', loadChildren: () => import('./toggle-button/toggle-button.module').then(m => m.ToggleButtonModule) },
  { path: 'calendar', loadChildren: () => import('./calendar/calendar.module').then(m => m.CalendarModule) },
  { path: 'alert', loadChildren: () => import('./alert/alert.module').then(m => m.AlertModule) },
  { path: 'carousel', loadChildren: () => import('./carousel/carousel.module').then(m => m.CarouselModule) },
  { path: 'datepicker', loadChildren: () => import('./datepicker/datepicker.module').then(m => m.DatepickerModule) },
  { path: 'rating', loadChildren: () => import('./rating/rating.module').then(m => m.RatingModule) },
  { path: 'accordion', loadChildren: () => import('./accordion/accordion.module').then(m => m.AccordionModule) },
  { path: 'card', loadChildren: () => import('./card/card.module').then(m => m.CardModule) },
  { path: 'progress-bar', loadChildren: () => import('./progress-bar/progress-bar.module').then(m => m.ProgressBarModule) },
  { path: 'tab-control', loadChildren: () => import('./tab-control/tab-control.module').then(m => m.TabControlModule) },
  { path: 'list-group', loadChildren: () => import('./list-group/list-group.module').then(m => m.ListGroupModule) },
  { path: 'grid', loadChildren: () => import('./grid/grid.module').then(m => m.GridModule) },
  { path: 'for-directive', loadChildren: () => import('./for-directive/for-directive.module').then(m => m.ForDirectiveModule) },
  { path: 'timepicker', loadChildren: () => import('./timepicker/timepicker.module').then(m => m.TimepickerModule) },
  { path: 'button-group', loadChildren: () => import('./button-group/button-group.module').then(m => m.ButtonGroupModule) },
  { path: 'breadcrumb', loadChildren: () => import('./breadcrumb/breadcrumb.module').then(m => m.BreadcrumbModule) },
  { path: 'badge', loadChildren: () => import('./badge/badge.module').then(m => m.BadgeModule) },
  { path: 'close', loadChildren: () => import('./close/close.module').then(m => m.CloseModule) },
  { path: 'spinner', loadChildren: () => import('./spinner/spinner.module').then(m => m.SpinnerModule) },
  { path: 'placeholder', loadChildren: () => import('./placeholder/placeholder.module').then(m => m.PlaceholderModule) },
  { path: 'pagination', loadChildren: () => import('./pagination/pagination.module').then(m => m.PaginationModule) },
  { path: 'table', loadChildren: () => import('./table/table.module').then(m => m.TableModule) },
  { path: 'range', loadChildren: () => import('./range/range.module').then(m => m.RangeModule) },
  { path: 'select', loadChildren: () => import('./select/select.module').then(m => m.SelectModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BasicRoutingModule { }
