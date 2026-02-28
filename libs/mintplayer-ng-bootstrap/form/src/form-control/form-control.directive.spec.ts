import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFormControlDirective } from './form-control.directive';
import { BsFormModule } from '../form.module';

@Component({
  selector: 'test-host',
  standalone: false,
  template: `<div></div>`,
})
class TestHostComponent {}

describe('BsFormControlDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsFormModule],
      declarations: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
