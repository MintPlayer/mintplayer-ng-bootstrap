/// <reference types="../../../../types" />

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  BsTreeviewComponent,
  type IconResolver,
  type TreeNode,
} from '@mintplayer/ng-bootstrap/treeview';

@Component({
  selector: 'demo-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  imports: [BsTreeviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeviewComponent {
  private icons = signal<Map<string, string>>(new Map());

  iconResolver: IconResolver = (iconKey) => this.icons().get(iconKey);

  readonly items = signal<TreeNode[]>([
    {
      id: 'inbox',
      label: 'Inbox',
      iconKey: 'inbox-fill',
      children: [
        {
          id: 'office',
          label: 'Office',
          iconKey: 'building',
          children: [
            { id: 'customers', label: 'Customers', iconKey: 'people-fill' },
            { id: 'coworkers', label: 'Co-Workers', iconKey: 'person-bounding-box' },
          ],
        },
        { id: 'others', label: 'Others', iconKey: 'inbox' },
      ],
    },
    { id: 'drafts', label: 'Drafts', iconKey: 'archive-fill' },
    { id: 'calendar', label: 'Calendar', iconKey: 'calendar3' },
    { id: 'contacts', label: 'Contacts', iconKey: 'person-lines-fill' },
    { id: 'deleted', label: 'Deleted Items', iconKey: 'trash-fill' },
  ]);

  readonly expandedIds = signal<string[]>(['inbox']);

  constructor() {
    this.loadIcons([
      'inbox-fill',
      'building',
      'people-fill',
      'person-bounding-box',
      'inbox',
      'archive-fill',
      'calendar3',
      'person-lines-fill',
      'trash-fill',
    ]);
  }

  private loadIcons(keys: ReadonlyArray<string>): void {
    Promise.all(
      keys.map((key) =>
        import(`bootstrap-icons/icons/${key}.svg`).then((mod) => [key, mod.default as string] as const),
      ),
    ).then((entries) => {
      const map = new Map<string, string>();
      entries.forEach(([k, v]) => map.set(k, v));
      this.icons.set(map);
    });
  }
}
