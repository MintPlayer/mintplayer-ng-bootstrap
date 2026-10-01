import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FileSystemNode, MpFileManager } from '@mintplayer/web-components/file-manager';
import { BsFileManagerComponent } from './file-manager.component';

@Component({
  imports: [BsFileManagerComponent],
  template: `
    <bs-file-manager #fm
      [nodes]="nodes()"
      [rootFolderId]="rootFolderId()"
      [(currentFolderId)]="currentFolderId"
      [(selectedIds)]="selectedIds"
      [allowUpload]="true"
      [allowOperations]="{ rename: false }"
      [(viewMode)]="viewMode"
      [selectionMode]="'single'"
      [searchPlaceholder]="placeholder()"
      [iconResolver]="iconResolver"
      [loadChildren]="loadChildren"
      [dialogResolver]="dialogResolver"
      [conflictResolver]="conflictResolver"
      [messages]="{ home: 'Start' }"
      (navigate)="log('navigate', $event)"
      (nodeOpen)="log('nodeOpen', $event)"
      (selectionChange)="log('selectionChange', $event)"
      (uploadRequest)="log('uploadRequest', $event)"
      (operation)="log('operation', $event)"
      (errorReported)="log('errorReported', $event)"
      (childrenLoaded)="log('childrenLoaded', $event)"
    ></bs-file-manager>`,
})
class HostComponent {
  readonly nodes = signal<FileSystemNode[]>([
    { id: 'root', name: 'Root', type: 'folder', parentId: null },
    { id: 'f1', name: 'a.txt', type: 'file', parentId: 'root' },
  ]);
  readonly rootFolderId = signal<string | null>(null);
  readonly currentFolderId = signal<string | null>(null);
  readonly selectedIds = signal<string[]>([]);
  readonly viewMode = signal<'list' | 'icons'>('list');
  readonly placeholder = signal('');
  readonly iconResolver = () => undefined;
  readonly loadChildren = async () => [];
  readonly dialogResolver = {} as never;
  readonly conflictResolver = (async () => 'replace') as never;
  readonly events: [string, unknown][] = [];
  log(name: string, detail: unknown) { this.events.push([name, detail]); }
}

describe('BsFileManagerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const wc = () => fixture.nativeElement.querySelector('mp-file-manager') as MpFileManager;
  const wrapper = () => fixture.debugElement.children[0].componentInstance as BsFileManagerComponent;
  const fire = (type: string, detail: unknown) => {
    wc().dispatchEvent(new CustomEvent(type, { detail }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('pushes every input to the element as a property', () => {
    const host = fixture.componentInstance;
    const el = wc();
    expect(el.nodes).toBe(host.nodes());
    expect(el.rootFolderId).toBeNull();
    expect(el.allowUpload).toBe(true);
    expect(el.allowOperations).toEqual({ rename: false });
    expect(el.viewMode).toBe('list');
    expect(el.selectionMode).toBe('single');
    expect(el.iconResolver).toBe(host.iconResolver);
    expect(el.loadChildren).toBe(host.loadChildren);
    expect(el.dialogResolver).toBe(host.dialogResolver);
    expect(el.conflictResolver).toBe(host.conflictResolver);
    expect(el.messages).toEqual(expect.objectContaining({ home: 'Start' }));

    host.rootFolderId.set('root');
    host.viewMode.set('icons');
    host.currentFolderId.set('root');
    fixture.detectChanges();
    expect(el.rootFolderId).toBe('root');
    expect(el.viewMode).toBe('icons');
    expect(el.currentFolderId).toBe('root');
  });

  it('leaves the element\'s localised search placeholder alone until one is given', () => {
    const initial = wc().searchPlaceholder;
    fixture.componentInstance.placeholder.set('Find files');
    fixture.detectChanges();
    expect(initial).not.toBe('Find files');
    expect(wc().searchPlaceholder).toBe('Find files');
  });

  it('navigate updates [(currentFolderId)] and re-emits', () => {
    fire('mp-navigate', { folderId: 'root' });
    expect(fixture.componentInstance.currentFolderId()).toBe('root');
    expect(fixture.componentInstance.events).toEqual([['navigate', { folderId: 'root' }]]);
  });

  it('selection-change updates [(selectedIds)] with a copy and re-emits', () => {
    const ids = ['f1'];
    fire('mp-selection-change', { selectedIds: ids });
    expect(fixture.componentInstance.selectedIds()).toEqual(['f1']);
    expect(fixture.componentInstance.selectedIds()).not.toBe(ids);
    expect(fixture.componentInstance.events.map(([n]) => n)).toEqual(['selectionChange']);
  });

  it.each([
    ['mp-node-open', 'nodeOpen'],
    ['mp-operation', 'operation'],
    ['mp-error', 'errorReported'],
    ['mp-children-loaded', 'childrenLoaded'],
  ])('%s is re-emitted as (%s) with its detail', (type, output) => {
    const detail = { marker: type };
    fire(type, detail);
    expect(fixture.componentInstance.events).toEqual([[output, detail]]);
  });

  it('upload-request syncs the uploads snapshot from the element before re-emitting', () => {
    const snapshot = [{ id: 'u1', progress: 0, status: 'pending' }];
    Object.defineProperty(wc(), 'uploads', { configurable: true, get: () => snapshot });
    fire('mp-upload-request', { files: [] });
    expect(wrapper().uploads()).toBe(snapshot);
    expect(fixture.componentInstance.events.map(([n]) => n)).toEqual(['uploadRequest']);
  });

  it('markPending / clearPending delegate and mirror the pending set', () => {
    const w = wrapper();
    w.markPending('f1', 'rename');
    expect(w.pendingOpIds().has('f1')).toBe(true);
    expect(w.pendingCount()).toBe(1);
    w.clearPending('f1');
    expect(w.pendingOpIds().has('f1')).toBe(false);
    expect(w.pendingCount()).toBe(0);
  });

  it('reportUploadProgress / clearUpload delegate and mirror the uploads', () => {
    const w = wrapper();
    const progress = vi.spyOn(wc(), 'reportUploadProgress');
    const clear = vi.spyOn(wc(), 'clearUpload');
    w.reportUploadProgress('u1', 50, 'uploading', undefined);
    expect(progress).toHaveBeenCalledWith('u1', 50, 'uploading', undefined);
    expect(w.uploads()).toBe(wc().uploads);
    w.clearUpload('u1');
    expect(clear).toHaveBeenCalledWith('u1');
    expect(w.uploads()).toBe(wc().uploads);
  });

  it('reportError fires the element\'s error event', () => {
    const report = vi.spyOn(wc(), 'reportError');
    wrapper().reportError('boom', 'f1');
    expect(report).toHaveBeenCalledWith('boom', 'f1');
  });
});
