import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsPhoneInputComponent } from './phone-input.component';
import type { MpPhoneInput } from '@mintplayer/web-components/phone-input';

@Component({
  imports: [FormsModule, BsPhoneInputComponent],
  template: `<bs-phone-input [(ngModel)]="phone" [defaultCountry]="'be'" [allowedCountries]="only()" />`,
})
class HostComponent {
  phone: string | null = null;
  only = signal<string[] | null>(null);
}

describe('BsPhoneInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const wc = () => fixture.nativeElement.querySelector('mp-phone-input') as MpPhoneInput;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the web component and forwards attribute inputs', () => {
    expect(wc()).toBeTruthy();
    expect(wc().getAttribute('default-country')).toBe('be');
  });

  it('joins array inputs into the comma-separated attributes the WC expects', async () => {
    fixture.componentInstance.only.set(['be', 'nl']);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(wc().getAttribute('allowed-countries')).toBe('be,nl');
  });

  it('writeValue pushes E.164 down; the WC decomposes it', async () => {
    fixture.componentInstance.phone = '+32470123456';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(wc().country).toBe('be');
    expect(wc().nationalNumber).toBe('470123456');
  });

  it('a WC value-change updates the bound model', async () => {
    wc().dispatchEvent(
      new CustomEvent('value-change', {
        detail: { value: '+32470123456', country: 'be', dialCode: '32', nationalNumber: '470123456', valid: true },
        bubbles: true,
        composed: true,
      }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.phone).toBe('+32470123456');
  });

  it('a country change marks the control touched, so `required` can surface', async () => {
    wc().dispatchEvent(
      new CustomEvent('country-change', { detail: { country: 'nl', dialCode: '31' }, bubbles: true, composed: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    // Touched is what gates the mirrored `invalid` attribute (Bootstrap's
    // convention), so without it a pristine required field could never report.
    expect(fixture.nativeElement.querySelector('bs-phone-input')).toBeTruthy();
  });
});
