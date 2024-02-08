import { Component } from '@angular/core';

@Component({
  selector: 'demo-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss']
})
export class TreeviewComponent {
  inboxFillLoader = () => import('bootstrap-icons/icons/inbox-fill.svg');
  buildingLoader = () => import('bootstrap-icons/icons/building.svg');
  peopleFillLoader = () => import('bootstrap-icons/icons/people-fill.svg');
  personBoundingBoxLoader = () => import('bootstrap-icons/icons/person-bounding-box.svg');
  inboxLoader = () => import('bootstrap-icons/icons/inbox.svg');
  archiveFillLoader = () => import('bootstrap-icons/icons/archive-fill.svg');
  calendar3Loader = () => import('bootstrap-icons/icons/calendar3.svg');
  personLinesFillLoader = () => import('bootstrap-icons/icons/person-lines-fill.svg');
  trashFillLoader = () => import('bootstrap-icons/icons/trash-fill.svg');
}
