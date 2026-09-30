import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  DockLayout,
  DockLayoutNode,
  DockLayoutSnapshot,
  MintDockManagerElement,
} from '@mintplayer/web-components/dock';
import { BsDockManagerComponent } from './dock-manager.component';
import { BsDockPaneComponent } from './dock-pane.component';

const stack = (...panes: string[]): DockLayoutNode => ({ kind: 'stack', panes, activePane: panes[0] });

@Component({
  selector: 'dock-manager-test',
  template: `
    <bs-dock-manager
      aria-label="Workspace"
      [layout]="layout()"
      [debugLayoutIntegrity]="debug()"
      (layoutChange)="changes.push($event)"
      (layoutSnapshotChange)="snapshots.push($event)">
      @for (name of paneNames(); track name) {
        <bs-dock-pane [name]="name"><p class="content">{{ name }} content</p></bs-dock-pane>
      }
    </bs-dock-manager>`,
  imports: [BsDockManagerComponent, BsDockPaneComponent],
})
class DockManagerTestComponent {
  readonly layout = signal<DockLayoutNode | DockLayout | null>(stack('a', 'b'));
  readonly debug = signal(false);
  readonly paneNames = signal(['a', 'b']);

  readonly changes: (DockLayoutSnapshot | null)[] = [];
  readonly snapshots: DockLayoutSnapshot[] = [];

  readonly manager = viewChild.required(BsDockManagerComponent);
}

describe('BsDockManagerComponent', () => {
  let fixture: ComponentFixture<DockManagerTestComponent>;
  let host: DockManagerTestComponent;

  const element = () => fixture.nativeElement.querySelector('mint-dock-manager') as MintDockManagerElement;
  const layoutChanged = (detail: DockLayoutSnapshot | undefined) =>
    element().dispatchEvent(new CustomEvent('dock-layout-changed', { detail, bubbles: true }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DockManagerTestComponent] }).compileComponents();
    fixture = TestBed.createComponent(DockManagerTestComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('feeding the layout in', () => {
    it('hands a bare node to the element as the docked root', () => {
      expect(element().layout.root).toMatchObject({ kind: 'stack', panes: ['a', 'b'] });
      expect(element().layout.floating).toEqual([]);
    });

    it('mirrors the layout as a JSON attribute', () => {
      const attr = JSON.parse(element().getAttribute('layout')!);
      expect(attr.root).toMatchObject({ kind: 'stack', panes: ['a', 'b'] });
    });

    it('re-applies the layout whenever the input signal changes', () => {
      host.layout.set({
        root: stack('c'),
        floating: [{ bounds: { left: 0, top: 0, width: 200, height: 100 }, root: stack('d') }],
        titles: { c: 'See' },
      });
      fixture.detectChanges();
      expect(element().layout.root).toMatchObject({ panes: ['c'] });
      expect(element().layout.floating).toHaveLength(1);
      expect(element().layout.titles).toEqual({ c: 'See' });
    });

    it('accepts a layout object with no floating array or titles', () => {
      host.layout.set({ root: stack('only') } as DockLayout);
      fixture.detectChanges();
      expect(element().layout).toMatchObject({ root: { panes: ['only'] }, floating: [], titles: {} });
    });

    it('clears the element and drops the attribute for a null layout', () => {
      host.layout.set(null);
      fixture.detectChanges();
      expect(element().layout.root).toBeNull();
      expect(element().hasAttribute('layout')).toBe(false);
      expect(host.manager().layoutSnapshot).toBeNull();
    });
  });

  describe('the integrity guard', () => {
    it('is a presence attribute that is absent by default', () => {
      expect(element().hasAttribute('debug-layout-integrity')).toBe(false);
      host.debug.set(true);
      fixture.detectChanges();
      expect(element().getAttribute('debug-layout-integrity')).toBe('');
      expect(element().debugLayoutIntegrity).toBe(true);
    });
  });

  describe('reporting changes out', () => {
    const changed: DockLayoutSnapshot = { root: stack('b', 'a'), floating: [], titles: {} };

    it('re-emits the element\'s layout change on both outputs', () => {
      layoutChanged(changed);
      expect(host.changes).toEqual([changed]);
      expect(host.snapshots).toEqual([changed]);
    });

    it('emits copies, so a consumer mutating them cannot reach the component', () => {
      layoutChanged(changed);
      (host.changes[0]!.root as { panes: string[] }).panes.push('mutated');
      expect(host.manager().layoutSnapshot!.root).toMatchObject({ panes: ['b', 'a'] });
      expect(host.snapshots[0]).not.toBe(host.changes[0]);
    });

    it('reports an emptied layout as null on layoutChange but as a snapshot on layoutSnapshotChange', () => {
      layoutChanged({ root: null, floating: [] });
      expect(host.changes).toEqual([null]);
      expect(host.snapshots).toEqual([{ root: null, floating: [] }]);
    });

    it('treats an event without a detail as an empty layout', () => {
      layoutChanged(undefined);
      expect(host.changes).toEqual([null]);
      expect(host.manager().layoutString()).toBeNull();
    });

    it('keeps the layout attribute in step with what the element reported', () => {
      layoutChanged(changed);
      expect(JSON.parse(host.manager().layoutString()!)).toEqual(changed);
    });
  });

  describe('captureLayout', () => {
    it('reads the element\'s live snapshot', () => {
      expect(host.manager().captureLayout().root).toMatchObject({ panes: ['a', 'b'] });
    });
  });

  describe('panes', () => {
    it('projects each pane\'s content into the element under a slot named after it', () => {
      const slotted = Array.from(element().children as HTMLCollectionOf<HTMLElement>).filter((el) =>
        el.classList.contains('bs-dock-pane'),
      );
      expect(slotted.map((el) => el.getAttribute('slot'))).toEqual(['a', 'b']);
      expect(slotted[0].querySelector('.content')!.textContent).toBe('a content');
    });

    it('adds and removes slotted panes as the pane list changes', () => {
      host.paneNames.set(['b', 'c']);
      fixture.detectChanges();
      const slots = Array.from(element().querySelectorAll<HTMLElement>('.bs-dock-pane')).map((el) =>
        el.getAttribute('slot'),
      );
      expect(slots).toEqual(['b', 'c']);
    });
  });

  describe('accessibility', () => {
    it('forwards the consumer\'s aria-label to the dock element', () => {
      expect(element().getAttribute('aria-label')).toBe('Workspace');
    });
  });
});
