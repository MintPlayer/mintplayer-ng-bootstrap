/// <reference types="../../../../types" />

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BsTreeviewComponent, BsTreeviewNodeTemplateDirective, type TreeNode } from '@mintplayer/ng-bootstrap/treeview';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  imports: [BsCodeSnippetComponent, BsTreeviewComponent, BsTreeviewNodeTemplateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeviewComponent {

  protected readonly snippetBasicHtml = dedent`
    <bs-treeview [items]="items()" [(expandedIds)]="expandedIds">
      <ng-container *bsTreeviewNode="let node">
        {{ node.label }}
      </ng-container>
    </bs-treeview>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsTreeviewComponent, BsTreeviewNodeTemplateDirective, type TreeNode } from '@mintplayer/ng-bootstrap/treeview';
    @Component({
      selector: 'my-treeview-demo',
      templateUrl: './my-treeview-demo.component.html',
      imports: [BsTreeviewComponent, BsTreeviewNodeTemplateDirective],
    })
    export class MyTreeviewDemoComponent {
      protected readonly items = signal<TreeNode[]>([
        {
          id: 'inbox',
          label: 'Inbox',
          children: [
            { id: 'customers', label: 'Customers' },
            { id: 'coworkers', label: 'Co-Workers' },
          ],
        },
        { id: 'drafts', label: 'Drafts' },
      ]);
      protected readonly expandedIds = signal<string[]>(['inbox']);
    }
  `;

  private readonly icons = signal<Map<string, SafeHtml>>(new Map());

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

  iconFor(key: string | undefined): SafeHtml | undefined {
    if (!key) return undefined;
    return this.icons().get(key);
  }

  constructor(private sanitizer: DomSanitizer) {
    // Imports must use literal strings — `import(`…${key}.svg`)` triggers
    // Vite's dynamic-import-vars glob expansion, which the jsdom test runner
    // FS-denies because node_modules sits outside the project root.
    const iconImports: ReadonlyArray<readonly [string, Promise<{ default: string }>]> = [
      ['inbox-fill', import('bootstrap-icons/icons/inbox-fill.svg')],
      ['building', import('bootstrap-icons/icons/building.svg')],
      ['people-fill', import('bootstrap-icons/icons/people-fill.svg')],
      ['person-bounding-box', import('bootstrap-icons/icons/person-bounding-box.svg')],
      ['inbox', import('bootstrap-icons/icons/inbox.svg')],
      ['archive-fill', import('bootstrap-icons/icons/archive-fill.svg')],
      ['calendar3', import('bootstrap-icons/icons/calendar3.svg')],
      ['person-lines-fill', import('bootstrap-icons/icons/person-lines-fill.svg')],
      ['trash-fill', import('bootstrap-icons/icons/trash-fill.svg')],
    ];
    Promise.all(
      iconImports.map(async ([key, p]) =>
        [key, sanitizer.bypassSecurityTrustHtml((await p).default)] as const,
      ),
    ).then((entries) => this.icons.set(new Map(entries)));
  }
}
