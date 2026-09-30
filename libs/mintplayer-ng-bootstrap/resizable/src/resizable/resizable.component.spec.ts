import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PresetPosition } from '../interfaces/preset-position';
import { ResizablePositioning } from '../types/positioning';
import { MockDirective, MockProvider } from 'ng-mocks';

import { BsResizableComponent } from './resizable.component';
import { BsResizeGlyphDirective } from '../resize-glyph/resize-glyph.directive';
import { RESIZABLE } from '../providers/resizable.provider';

describe('BsResizableComponent', () => {
  let component: BsResizableComponent;
  let fixture: ComponentFixture<BsResizableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsResizableComponent,
        
        // Mock dependencies
        MockDirective(BsResizeGlyphDirective),
      ],
      providers: [
        MockProvider(RESIZABLE, BsResizableComponent, 'useClass')
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsResizableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  imports: [BsResizableComponent],
  template: `<bs-resizable [positioning]="positioning()" [presetPosition]="preset()" [horizontal]="horizontal()" [vertical]="vertical()" [corners]="corners()">x</bs-resizable>`,
})
class ResizableHostComponent {
  readonly positioning = signal<ResizablePositioning>('absolute');
  readonly preset = signal<PresetPosition | undefined>(undefined);
  readonly horizontal = signal(true);
  readonly vertical = signal(true);
  readonly corners = signal(true);
}

describe('BsResizableComponent behaviour', () => {
  let fixture: ComponentFixture<ResizableHostComponent>;
  const resizable = () => fixture.debugElement.query(By.directive(BsResizableComponent)).componentInstance as BsResizableComponent;
  const host = () => fixture.nativeElement.querySelector('bs-resizable') as HTMLElement;
  const glyphCount = () => fixture.nativeElement.querySelectorAll('[role=separator]').length;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(ResizableHostComponent);
    fixture.detectChanges();
  });

  it('positions itself absolutely or relatively', () => {
    expect(host().classList).toContain('position-absolute');
    fixture.componentInstance.positioning.set('inline');
    fixture.detectChanges();
    expect(host().classList).toContain('position-relative');
  });

  it('a preset position sizes and places the box and drops any margins', () => {
    resizable().marginLeft.set(5);
    fixture.componentInstance.preset.set({ left: 10, top: 20, width: 300, height: 200 });
    fixture.detectChanges();
    const r = resizable();
    expect([r.left(), r.top(), r.width(), r.height()]).toEqual([10, 20, 300, 200]);
    expect(r.marginLeft()).toBeUndefined();
    expect(host().style.width).toBe('300px');
    expect(host().style.left).toBe('10px');
  });

  it('offers corner glyphs only when it resizes both ways', () => {
    expect(glyphCount()).toBe(8);
    fixture.componentInstance.corners.set(false);
    fixture.detectChanges();
    expect(glyphCount()).toBe(4);
    fixture.componentInstance.corners.set(true);
    fixture.componentInstance.vertical.set(false);
    fixture.detectChanges();
    expect(glyphCount()).toBe(2);
  });
});
