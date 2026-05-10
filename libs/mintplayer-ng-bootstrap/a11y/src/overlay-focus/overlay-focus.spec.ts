import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { A11yModule } from '@angular/cdk/a11y';
import { BsOverlayFocusDirective } from './overlay-focus.directive';

@Component({
  selector: 'bs-overlay-focus-harness',
  imports: [BsOverlayFocusDirective],
  template: `
    <button type="button" data-testid="trigger">Open</button>
    <div [bsOverlayFocus]="active()" data-testid="overlay" tabindex="-1">
      <button type="button" data-testid="first">First</button>
      <button type="button" data-testid="second">Second</button>
      <button type="button" data-testid="third">Third</button>
    </div>
  `,
})
class HarnessComponent {
  active = signal(false);
}

describe('BsOverlayFocusDirective', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [A11yModule, HarnessComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  const byTestId = (id: string) =>
    fixture.nativeElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

  it('does nothing while inactive', () => {
    byTestId('trigger').focus();
    expect(document.activeElement).toBe(byTestId('trigger'));
  });

  it('moves focus to the first tabbable element on activation', async () => {
    byTestId('trigger').focus();
    host.active.set(true);
    fixture.detectChanges();
    await new Promise(r => queueMicrotask(() => r(null)));
    await Promise.resolve();

    expect(document.activeElement).toBe(byTestId('first'));
  });

  it('returns focus to the original trigger on deactivation', async () => {
    const trigger = byTestId('trigger');
    trigger.focus();

    host.active.set(true);
    fixture.detectChanges();
    await Promise.resolve();

    host.active.set(false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger);
  });

  it('skips elements inside a disabled fieldset when picking initial focus', async () => {
    @Component({
      selector: 'bs-disabled-fieldset',
      imports: [BsOverlayFocusDirective],
      template: `
        <button type="button" data-testid="trigger">Open</button>
        <div [bsOverlayFocus]="active()" tabindex="-1">
          <fieldset disabled>
            <button type="button" data-testid="inside-disabled">X</button>
          </fieldset>
          <button type="button" data-testid="reachable">Y</button>
        </div>
      `,
    })
    class DisabledFieldsetHarness {
      active = signal(false);
    }

    await TestBed.resetTestingModule().configureTestingModule({
      imports: [A11yModule, DisabledFieldsetHarness],
    }).compileComponents();
    const f = TestBed.createComponent(DisabledFieldsetHarness);
    document.body.appendChild(f.nativeElement);
    const trigger = f.nativeElement.querySelector<HTMLElement>('[data-testid="trigger"]')!;
    trigger.focus();

    f.componentInstance.active.set(true);
    f.detectChanges();
    await Promise.resolve();

    expect(document.activeElement).toBe(f.nativeElement.querySelector('[data-testid="reachable"]'));
    f.nativeElement.remove();
  });

  it('skips return-focus when [returnFocus] is false', async () => {
    @Component({
      selector: 'bs-no-return',
      imports: [BsOverlayFocusDirective],
      template: `
        <button type="button" data-testid="trigger">Open</button>
        <div [bsOverlayFocus]="active()" [returnFocus]="false">
          <button type="button" data-testid="inside">x</button>
        </div>
      `,
    })
    class NoReturnHarness {
      active = signal(false);
    }

    await TestBed.resetTestingModule().configureTestingModule({
      imports: [A11yModule, NoReturnHarness],
    }).compileComponents();
    const f = TestBed.createComponent(NoReturnHarness);
    document.body.appendChild(f.nativeElement);
    const trigger = f.nativeElement.querySelector<HTMLElement>('[data-testid="trigger"]')!;
    trigger.focus();

    f.componentInstance.active.set(true);
    f.detectChanges();
    await Promise.resolve();

    f.componentInstance.active.set(false);
    f.detectChanges();

    expect(document.activeElement).not.toBe(trigger);
    f.nativeElement.remove();
  });
});
