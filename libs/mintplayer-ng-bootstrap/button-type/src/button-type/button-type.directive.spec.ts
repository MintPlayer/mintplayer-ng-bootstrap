import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from './button-type.directive';

@Component({
  selector: 'test-host',
  imports: [BsButtonTypeDirective],
  template: `<button>Test</button>`,
})
class TestHostComponent {}

describe('BsButtonTypeDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
