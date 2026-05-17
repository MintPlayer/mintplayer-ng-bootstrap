import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { BsCardBodyComponent } from './bs-card-body.component';
import { BsCardTitleComponent } from './bs-card-title.component';
import { BsCardSubtitleComponent } from './bs-card-subtitle.component';
import { BsCardTextComponent } from './bs-card-text.component';
import { BsCardGroupComponent } from './bs-card-group.component';

describe('Structural card components — host class smoke', () => {
  beforeEach(() => TestBed.resetTestingModule());

  const cases: Array<{ name: string; component: new () => unknown; cls: string }> = [
    { name: 'BsCardBodyComponent', component: BsCardBodyComponent, cls: 'card-body' },
    { name: 'BsCardTitleComponent', component: BsCardTitleComponent, cls: 'card-title' },
    { name: 'BsCardSubtitleComponent', component: BsCardSubtitleComponent, cls: 'card-subtitle' },
    { name: 'BsCardTextComponent', component: BsCardTextComponent, cls: 'card-text' },
    { name: 'BsCardGroupComponent', component: BsCardGroupComponent, cls: 'card-group' },
  ];

  for (const { name, component, cls } of cases) {
    it(`${name} applies .${cls} on its host element`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [component] });
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.classList.contains(cls)).toBe(true);
    });
  }
});
