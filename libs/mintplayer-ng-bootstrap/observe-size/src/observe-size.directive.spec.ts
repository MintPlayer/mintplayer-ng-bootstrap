import { vi } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsObserveSizeDirective, contentBoxSize } from './observe-size.directive';

@Component({
  selector: 'test-host',
  imports: [BsObserveSizeDirective],
  template: `<div bsObserveSize></div>`
})
class TestHostComponent {}

describe('ObserveSizeDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    // We mocked "ResizeObserver" here 💥.
    global.ResizeObserver = class MockedResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('contentBoxSize', () => {
  const element = (style: Partial<CSSStyleDeclaration>) => {
    const el = document.createElement('div');
    Object.assign(el.style, style);
    document.body.appendChild(el);
    return el;
  };

  afterEach(() => document.body.replaceChildren());

  it('keeps the fractional used size of a content-box element', () => {
    const el = element({ width: '63.733px', height: '31.5px', padding: '8px 12px' });
    expect(contentBoxSize(el)).toEqual({ width: 63.733, height: 31.5 });
  });

  it('subtracts padding and border from a border-box element, like contentRect', () => {
    const el = element({
      boxSizing: 'border-box', width: '100.5px', height: '40px',
      padding: '8px 12px', borderWidth: '1px', borderStyle: 'solid',
    });
    expect(contentBoxSize(el)).toEqual({ width: 74.5, height: 22 });
  });
});