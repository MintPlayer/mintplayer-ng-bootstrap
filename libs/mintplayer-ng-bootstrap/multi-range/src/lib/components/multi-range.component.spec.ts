import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BsMultiRangeComponent } from './multi-range.component';

describe('BsMultiRangeComponent', () => {
  describe('basic rendering', () => {
    let fixture: ComponentFixture<BsMultiRangeComponent>;
    let component: BsMultiRangeComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [BsMultiRangeComponent] }).compileComponents();
      fixture = TestBed.createComponent(BsMultiRangeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('renders the mp-multi-range custom element with primitive inputs forwarded as attributes', () => {
      const wc = fixture.nativeElement.querySelector('mp-multi-range') as HTMLElement;
      expect(wc).toBeTruthy();
      expect(wc.getAttribute('min')).toBe('0');
      expect(wc.getAttribute('max')).toBe('100');
      expect(wc.getAttribute('step')).toBe('1');
      expect(wc.getAttribute('orientation')).toBe('horizontal');
    });
  });

  describe('value accessor — template-driven (ngModel)', () => {
    @Component({
      selector: 'host-tdf',
      imports: [BsMultiRangeComponent, FormsModule],
      template: `<bs-multi-range [(ngModel)]="value" [min]="0" [max]="100"></bs-multi-range>`,
    })
    class HostTdfComponent {
      readonly value = signal<number[] | null>([20, 80]);
    }

    let fixture: ComponentFixture<HostTdfComponent>;
    let host: HostTdfComponent;
    let wc: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostTdfComponent, BsMultiRangeComponent, FormsModule],
      }).compileComponents();
      fixture = TestBed.createComponent(HostTdfComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      wc = fixture.nativeElement.querySelector('mp-multi-range') as HTMLElement;
    });

    it('updates the host signal when the WC fires value-input', async () => {
      wc.dispatchEvent(new CustomEvent('value-input', {
        detail: [25, 75], bubbles: true, composed: true,
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.value()).toEqual([25, 75]);
    });
  });

  describe('value accessor — reactive forms (FormControl)', () => {
    @Component({
      selector: 'host-rf',
      imports: [BsMultiRangeComponent, ReactiveFormsModule],
      template: `<bs-multi-range [formControl]="control" [min]="0" [max]="100"></bs-multi-range>`,
    })
    class HostRfComponent {
      readonly control = new FormControl<number[]>([10, 50, 90], { nonNullable: true });
    }

    let fixture: ComponentFixture<HostRfComponent>;
    let host: HostRfComponent;
    let wc: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostRfComponent, BsMultiRangeComponent, ReactiveFormsModule],
      }).compileComponents();
      fixture = TestBed.createComponent(HostRfComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      wc = fixture.nativeElement.querySelector('mp-multi-range') as HTMLElement;
    });

    it('updates the FormControl when the WC fires value-input', async () => {
      wc.dispatchEvent(new CustomEvent('value-input', {
        detail: [15, 55, 95], bubbles: true, composed: true,
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.control.value).toEqual([15, 55, 95]);
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

    it('marks FormControl as touched when value-change fires', async () => {
      expect(host.control.touched).toBe(false);
      wc.dispatchEvent(new CustomEvent('value-change', {
        detail: [10, 50, 90], bubbles: true, composed: true,
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.control.touched).toBe(true);
    });
  });
});
