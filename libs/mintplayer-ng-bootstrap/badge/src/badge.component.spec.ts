import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Color } from '@mintplayer/ng-bootstrap';

import { BsBadgeComponent } from './badge.component';

describe('BsBadgeComponent', () => {
  let component: BsBadgeComponent;
  let fixture: ComponentFixture<BsBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function classesFor(type: Color): string[] {
    fixture.componentRef.setInput('type', type);
    fixture.detectChanges();
    return [...(fixture.nativeElement.querySelector('.badge') as HTMLElement).classList];
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // `.badge` paints white text, and `bg-*` sets only the background: warning
  // (1.63:1), info (1.96:1) and light (1.05:1) failed WCAG AA. `text-bg-*` pairs
  // each theme colour with the text colour Bootstrap's color-contrast() picks.
  it.each(
    [Color.primary, Color.secondary, Color.success, Color.danger, Color.warning, Color.info, Color.light, Color.dark]
      .map((type) => ({ type, name: Color[type] })),
  )('paints $name with its text-bg-* class', ({ type, name }) => {
    expect(classesFor(type)).toEqual(['badge', `text-bg-${name}`]);
  });

  // Bootstrap has no text-bg-* for these three, and white text on them was
  // invisible. They pair a background with a text utility instead.
  it.each([
    { name: 'body', type: Color.body, classes: ['badge', 'bg-body', 'text-body'] },
    { name: 'white', type: Color.white, classes: ['badge', 'bg-white', 'text-black'] },
    { name: 'transparent', type: Color.transparent, classes: ['badge', 'bg-transparent', 'text-reset'] },
  ])('pairs $name with a contrasting text colour', ({ type, classes }) => {
    expect(classesFor(type)).toEqual(classes);
  });

  it('drops the previous colour when the type changes', () => {
    classesFor(Color.white);
    expect(classesFor(Color.warning)).toEqual(['badge', 'text-bg-warning']);
  });
});
