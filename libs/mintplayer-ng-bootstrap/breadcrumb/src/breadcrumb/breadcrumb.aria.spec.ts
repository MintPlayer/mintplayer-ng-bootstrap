import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsBreadcrumbComponent } from './breadcrumb.component';
import { BsBreadcrumbItemComponent } from '../breadcrumb-item/breadcrumb-item.component';

@Component({
  selector: 'bs-breadcrumb-aria-harness',
  imports: [BsBreadcrumbComponent, BsBreadcrumbItemComponent],
  template: `
    <bs-breadcrumb>
      <bs-breadcrumb-item><a href="/">Home</a></bs-breadcrumb-item>
      <bs-breadcrumb-item><a href="/library">Library</a></bs-breadcrumb-item>
      <bs-breadcrumb-item [active]="active()">Data</bs-breadcrumb-item>
    </bs-breadcrumb>
  `,
})
class HarnessComponent {
  active = signal(true);
}

describe('BsBreadcrumb ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const items = () => Array.from(fixture.nativeElement.querySelectorAll<HTMLElement>('bs-breadcrumb-item'));

  it('breadcrumb has nav landmark with aria-label', () => {
    const nav = fixture.nativeElement.querySelector<HTMLElement>('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('breadcrumb');
  });

  it('every item has role="listitem"', () => {
    items().forEach(item => expect(item.getAttribute('role')).toBe('listitem'));
  });

  it('only the active item carries aria-current="page"', () => {
    const all = items();
    expect(all[0].hasAttribute('aria-current')).toBe(false);
    expect(all[1].hasAttribute('aria-current')).toBe(false);
    expect(all[2].getAttribute('aria-current')).toBe('page');
  });

  it('toggling active flips aria-current', () => {
    host.active.set(false);
    fixture.detectChanges();
    expect(items()[2].hasAttribute('aria-current')).toBe(false);
  });
});
