import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsOtpInputComponent } from './otp-input.component';
describe('BsOtpInputComponent', () => {
  describe('basic rendering', () => {
    let fixture: ComponentFixture<BsOtpInputComponent>;
    let component: BsOtpInputComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [BsOtpInputComponent] }).compileComponents();
      fixture = TestBed.createComponent(BsOtpInputComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('creates', () => {
      expect(component).toBeTruthy();
    });

    it('renders the mp-otp-input custom element with attributes forwarded', () => {
      const wc = fixture.nativeElement.querySelector('mp-otp-input') as HTMLElement;
      expect(wc).toBeTruthy();
      expect(wc.getAttribute('type')).toBe('numeric');
      expect(wc.getAttribute('case')).toBe('upper');
      expect(wc.getAttribute('size')).toBe('md');
    });
  });

  describe('value accessor — template-driven (ngModel)', () => {
    @Component({
      selector: 'host-tdf',
      imports: [BsOtpInputComponent, FormsModule],
      template: `<bs-otp-input [(ngModel)]="value"></bs-otp-input>`,
    })
    class HostTdfComponent {
      readonly value = signal<string | null>('');
    }

    let fixture: ComponentFixture<HostTdfComponent>;
    let host: HostTdfComponent;
    let wc: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostTdfComponent, BsOtpInputComponent, FormsModule],
      }).compileComponents();
      fixture = TestBed.createComponent(HostTdfComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      wc = fixture.nativeElement.querySelector('mp-otp-input') as HTMLElement;
    });

    it('updates the host signal when the WC fires value-change', async () => {
      wc.dispatchEvent(new CustomEvent('value-change', {
        detail: '123456', bubbles: true, composed: true,
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.value()).toBe('123456');
    });
  });

  describe('value accessor — reactive forms (FormControl)', () => {
    @Component({
      selector: 'host-rf',
      imports: [BsOtpInputComponent, ReactiveFormsModule],
      template: `<bs-otp-input [formControl]="control"></bs-otp-input>`,
    })
    class HostRfComponent {
      readonly control = new FormControl<string>('', { nonNullable: true });
    }

    let fixture: ComponentFixture<HostRfComponent>;
    let host: HostRfComponent;
    let wc: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostRfComponent, BsOtpInputComponent, ReactiveFormsModule],
      }).compileComponents();
      fixture = TestBed.createComponent(HostRfComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      wc = fixture.nativeElement.querySelector('mp-otp-input') as HTMLElement;
    });

    it('updates the FormControl when value-change fires', async () => {
      wc.dispatchEvent(new CustomEvent('value-change', {
        detail: '987654', bubbles: true, composed: true,
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.control.value).toBe('987654');
    });

    it('toggles the WC disabled attribute via setDisabledState', async () => {
      host.control.disable();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(wc.hasAttribute('disabled')).toBe(true);

      host.control.enable();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(wc.hasAttribute('disabled')).toBe(false);
    });

    it('does not lose form-disabled state when an unrelated signal change re-runs CD', async () => {
      // Regression for the Gemini-flagged race: previously the wrapper's
      // template had `[attr.disabled]="disabledAttr()"`, which would clobber
      // the CVA's setAttribute('disabled', '') on the next CD cycle whenever
      // another signal-bound attribute re-evaluated. We now own the attribute
      // via a single effect, so the CVA's write is stable.
      host.control.disable();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(wc.hasAttribute('disabled')).toBe(true);

      // Force a CD pass by emitting an unrelated event — value-change drives
      // the wrapper's onValueChange which updates the value() model.
      wc.dispatchEvent(new CustomEvent('value-change', {
        detail: '111111', bubbles: true, composed: true,
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(wc.hasAttribute('disabled')).toBe(true);
    });

    it('marks FormControl as touched on focusout', async () => {
      expect(host.control.touched).toBe(false);
      // Use dispatchEvent on the host element of bs-otp-input — that's where
      // the value accessor listens for focusout.
      const bsHost = fixture.nativeElement.querySelector('bs-otp-input') as HTMLElement;
      bsHost.dispatchEvent(new Event('focusout', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.control.touched).toBe(true);
    });

    it('writeValue from the form control pushes value into the WC property', async () => {
      host.control.setValue('111222');
      fixture.detectChanges();
      await fixture.whenStable();
      expect((wc as unknown as { value: string }).value).toBe('111222');
    });
  });

  describe('reactive forms — invalid state via validators', () => {
    @Component({
      selector: 'host-val',
      imports: [BsOtpInputComponent, ReactiveFormsModule],
      template: `<bs-otp-input [formControl]="control"></bs-otp-input>`,
    })
    class HostValComponent {
      readonly control = new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      });
    }

    let fixture: ComponentFixture<HostValComponent>;
    let host: HostValComponent;
    let wc: HTMLElement;
    let bsHost: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostValComponent, BsOtpInputComponent, ReactiveFormsModule],
      }).compileComponents();
      fixture = TestBed.createComponent(HostValComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      wc = fixture.nativeElement.querySelector('mp-otp-input') as HTMLElement;
      bsHost = fixture.nativeElement.querySelector('bs-otp-input') as HTMLElement;
    });

    it('does not mark the WC invalid until touched', async () => {
      // Initially invalid (empty + required) but not touched.
      expect(host.control.invalid).toBe(true);
      expect(host.control.touched).toBe(false);
      expect(wc.hasAttribute('invalid')).toBe(false);
    });

    it('marks the WC invalid once touched and the value is still invalid', async () => {
      // Type a partial then blur.
      wc.dispatchEvent(new CustomEvent('value-change', {
        detail: '123', bubbles: true, composed: true,
      }));
      bsHost.dispatchEvent(new Event('focusout', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      // Allow the microtask-scheduled syncInvalid to fire.
      await new Promise<void>((r) => queueMicrotask(() => r()));
      fixture.detectChanges();
      expect(host.control.touched).toBe(true);
      expect(host.control.invalid).toBe(true);
      expect((wc as unknown as { invalid: boolean }).invalid).toBe(true);
    });

    it('clears the WC invalid state once the value becomes valid', async () => {
      // Touch first.
      bsHost.dispatchEvent(new Event('focusout', { bubbles: true }));
      // Then satisfy validation.
      wc.dispatchEvent(new CustomEvent('value-change', {
        detail: '123456', bubbles: true, composed: true,
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise<void>((r) => queueMicrotask(() => r()));
      fixture.detectChanges();
      expect(host.control.valid).toBe(true);
      expect((wc as unknown as { invalid: boolean }).invalid).toBe(false);
    });
  });

  describe('focus delegation', () => {
    let fixture: ComponentFixture<BsOtpInputComponent>;
    let bsHost: HTMLElement;
    let wc: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [BsOtpInputComponent] }).compileComponents();
      fixture = TestBed.createComponent(BsOtpInputComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      bsHost = fixture.nativeElement as HTMLElement;
      wc = bsHost.querySelector('mp-otp-input') as HTMLElement;
    });

    it('replaces the host element\'s focus() so calling it delegates to the hidden input', () => {
      // Spy on the WC's focus method — the wrapper's override should call into it.
      let invoked = false;
      const original = wc.focus.bind(wc);
      (wc as unknown as { focus: (o?: FocusOptions) => void }).focus = (o) => {
        invoked = true;
        return original(o);
      };
      // This is the call path FocusOnLoadDirective takes.
      (bsHost as unknown as { focus: () => void }).focus();
      expect(invoked).toBe(true);
    });
  });

  describe('complete event', () => {
    @Component({
      selector: 'host-complete',
      imports: [BsOtpInputComponent],
      template: `<bs-otp-input (complete)="onComplete($event)"></bs-otp-input>`,
    })
    class HostCompleteComponent {
      readonly received: string[] = [];
      onComplete(v: string) { this.received.push(v); }
    }

    it('forwards the WC complete event as an Angular output', async () => {
      await TestBed.configureTestingModule({
        imports: [HostCompleteComponent, BsOtpInputComponent],
      }).compileComponents();
      const fixture = TestBed.createComponent(HostCompleteComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      const wc = fixture.nativeElement.querySelector('mp-otp-input') as HTMLElement;
      wc.dispatchEvent(new CustomEvent('complete', {
        detail: '654321', bubbles: true, composed: true,
      }));
      fixture.detectChanges();
      expect(fixture.componentInstance.received).toEqual(['654321']);
    });
  });
});
