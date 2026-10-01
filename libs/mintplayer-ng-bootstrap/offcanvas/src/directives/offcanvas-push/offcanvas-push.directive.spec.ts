import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AnimationBuilder } from '@angular/animations';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsOffcanvasHostComponent } from '../../components';
import { BsOffcanvasPushDirective } from './offcanvas-push.directive';

/** Only `isVisible` is read from the offcanvas. */
const fakeOffcanvas = (visible: ReturnType<typeof signal<boolean>>) =>
  ({ isVisible: visible }) as unknown as BsOffcanvasHostComponent;

@Component({
  selector: 'bs-offcanvas-test',
  imports: [BsOffcanvasPushDirective],
  template: `
    <div class="scroller">
      <div class="wrapper">
        <main class="pushed" [bsOffcanvasPush]="offcanvas()"></main>
      </div>
    </div>`,
})
class HostComponent {
  readonly visible = signal(false);
  readonly offcanvas = signal<BsOffcanvasHostComponent | null>(fakeOffcanvas(this.visible));
}

describe('BsOffcanvasPushDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let played: string[];
  const q = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations()] });
    played = [];
    const builder = TestBed.inject(AnimationBuilder);
    const build = builder.build.bind(builder);
    // Record which way each animation pushes (the target margin-left of its last step).
    vi.spyOn(builder, 'build').mockImplementation((steps) => {
      const list = steps as { styles?: { styles?: Record<string, string>[] } | Record<string, string> }[];
      played.push(JSON.stringify(list[list.length - 1]).includes('400px') ? 'push' : 'restore');
      return build(steps);
    });
    fixture = TestBed.createComponent(HostComponent);
  });

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    // the noop player finishes on a microtask
    await Promise.resolve();
  };

  it('does not animate for the initial state', async () => {
    await settle();
    expect(played).toEqual([]);
  });

  it('pushes the content aside when the offcanvas opens, and back when it closes', async () => {
    await settle();
    fixture.componentInstance.visible.set(true);
    await settle();
    fixture.componentInstance.visible.set(false);
    await settle();
    expect(played).toEqual(['push', 'restore']);
  });

  it('does nothing for a repeated value or with no offcanvas', async () => {
    fixture.componentInstance.offcanvas.set(null);
    await settle();
    fixture.componentInstance.visible.set(true);
    await settle();
    expect(played).toEqual([]);
  });

  it('clips horizontal overflow on the scrolling ancestor while open, and restores ITS own value after', async () => {
    fixture.detectChanges();
    const scroller = q('.scroller');
    scroller.parentElement!.style.overflowX = 'visible';
    scroller.style.overflowX = 'clip';
    q('.wrapper').style.overflowX = 'auto';
    await settle();

    fixture.componentInstance.visible.set(true);
    await settle();
    // the walk stops at the first element whose parent scrolls or shows its overflow
    expect(scroller.style.overflowX).toBe('hidden');
    expect(q('.wrapper').style.overflowX).toBe('auto');

    fixture.componentInstance.visible.set(false);
    await settle();
    // restored to the clipped element's own value, not the direct parent's ('auto')
    expect(scroller.style.overflowX).toBe('clip');
  });
});
