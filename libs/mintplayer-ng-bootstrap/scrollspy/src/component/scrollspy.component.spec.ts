import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsScrollspyDirective } from '../directives/scrollspy.directive';
import { ExtraOptions, ROUTER_CONFIGURATION } from '@angular/router';

import { activeSectionIndex, BsScrollspyComponent, sectionScrollTop } from './scrollspy.component';

describe('BsScrollspyComponent', () => {
  let component: BsScrollspyComponent;
  let fixture: ComponentFixture<BsScrollspyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BsScrollspyComponent ],
      providers: [{
        provide: ROUTER_CONFIGURATION,
        useValue: <ExtraOptions>{
          scrollOffset: [0, 56]
        }
      }]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsScrollspyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('activeSectionIndex', () => {
  it('is -1 without sections', () => {
    expect(activeSectionIndex([], 100)).toBe(-1);
  });

  it('is the first section before any has passed the trigger line', () => {
    expect(activeSectionIndex([200, 400, 800], 100)).toBe(0);
  });

  it('is the last section that has passed the trigger line', () => {
    expect(activeSectionIndex([-500, -20, 99, 400], 100)).toBe(2);
    // exactly on the line is not yet passed
    expect(activeSectionIndex([-500, 100], 100)).toBe(0);
  });
});

describe('sectionScrollTop', () => {
  it('scrolls the section 1px past the trigger line', () => {
    // section 300px below a container top at 50, container already scrolled 120
    expect(sectionScrollTop(350, 50, 120)).toBe(421);
    // window with a 56px fixed header, scrolled 1000
    expect(sectionScrollTop(200, 56, 1000)).toBe(1145);
  });
});

@Component({
  imports: [BsScrollspyComponent, BsScrollspyDirective],
  template: `
    <div class="scroller">
      <bs-scrollspy [scrollContainer]="container()" [ariaLabel]="label()">
        <h2 bsScrollspy>Intro</h2>
        <h3 bsScrollspy>Details</h3>
      </bs-scrollspy>
    </div>`,
})
class HostComponent {
  readonly container = signal<HTMLElement | null>(null);
  readonly label = signal('Section navigation');
}

describe('BsScrollspyComponent behaviour', () => {
  let fixture: ComponentFixture<HostComponent>;
  const spy = () => fixture.debugElement.query(By.directive(BsScrollspyComponent)).componentInstance as BsScrollspyComponent;
  const buttons = () => [...fixture.nativeElement.querySelectorAll('nav button')] as HTMLButtonElement[];

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('lists one button per section, named after it and styled by its heading level', () => {
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Intro', 'Details']);
    expect(buttons()[0].classList).toContain('navH2');
    expect(buttons()[1].classList).toContain('navH3');
  });

  it('marks the active section as the current location', () => {
    fixture.detectChanges();
    // jsdom lays nothing out: every section sits at 0, above the trigger line, so the last is active
    const current = buttons().filter((b) => b.getAttribute('aria-current') === 'location');
    expect(current.map((b) => b.textContent?.trim())).toEqual(['Details']);
    expect(current[0].classList).toContain('fw-bold');
    expect(buttons()[0].classList).not.toContain('fw-bold');
  });

  it('names its navigation, translatably', () => {
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe('Section navigation');
    fixture.componentInstance.label.set('Inhoud');
    fixture.detectChanges();
    expect(nav.getAttribute('aria-label')).toBe('Inhoud');
  });

  it('a click scrolls the window to the section', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    buttons()[1].click();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('with an explicit container, scrolls the container instead, and follows its scrolling', () => {
    const container = fixture.nativeElement.querySelector('.scroller') as HTMLElement;
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo as typeof container.scrollTo;
    fixture.componentInstance.container.set(container);
    fixture.detectChanges();
    const windowScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    buttons()[1].click();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    expect(windowScroll).not.toHaveBeenCalled();

    const setActive = vi.spyOn(spy(), 'setActiveDirective');
    container.dispatchEvent(new Event('scroll'));
    expect(setActive).toHaveBeenCalled();
  });
});
