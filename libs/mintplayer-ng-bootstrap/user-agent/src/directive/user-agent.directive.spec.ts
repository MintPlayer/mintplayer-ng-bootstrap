import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsUserAgentDirective } from './user-agent.directive';

@Component({
  selector: 'test-host',
  standalone: true,
  imports: [BsUserAgentDirective],
  template: `<div bsUserAgent></div>`,
})
class TestHostComponent {}

describe('BsUserAgentDirective', () => {
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
