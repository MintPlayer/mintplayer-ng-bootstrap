import { BsStrikethroughPipe } from './strikethrough.pipe';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

@Component({
  selector: 'bs-strikethrough-test',
  imports: [BsStrikethroughPipe],
  template: `<span [innerHTML]="'~~Hello world~~' | bsStrikethrough"></span>`
})
class BsStrikethroughTestComponent {}

describe('BsStrikethroughPipe', () => {
  let component: BsStrikethroughTestComponent;
  let fixture: ComponentFixture<BsStrikethroughTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Pipe to test
        BsStrikethroughPipe,
        // Testbench
        BsStrikethroughTestComponent
      ],
      providers: []
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsStrikethroughTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the right html', () => {
    const spanElement = fixture.debugElement.query(By.css('span'));
    expect(spanElement).toBeTruthy();
    expect(spanElement.nativeElement.innerHTML).toBe('<strike>Hello world</strike>');
  });
});
