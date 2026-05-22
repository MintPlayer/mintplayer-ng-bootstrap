import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsUnderlinePipe } from './underline.pipe';

@Component({
  selector: 'bs-underline-test',
  imports: [BsUnderlinePipe],
  template: `<span [innerHTML]="'<ins>Hello world</ins>' | bsUnderline"></span>`
})
class BsUnderlineTestComponent {}

describe('BsUnderlinePipe', () => {
  let component: BsUnderlineTestComponent;
  let fixture: ComponentFixture<BsUnderlineTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Pipe to test
        BsUnderlinePipe,
        // Testbench
        BsUnderlineTestComponent
      ],
      providers: []
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsUnderlineTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the right html', () => {
    const spanElement = fixture.debugElement.query(By.css('span'));
    expect(spanElement).toBeTruthy();
    expect(spanElement.nativeElement.innerHTML).toBe('<u>Hello world</u>');
  });
});
