import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsItalicPipe } from './italic.pipe';

@Component({
  selector: 'bs-italic-test',
  template: `<span [innerHTML]="'*Hello world*' | bsItalic"></span>`
})
class BsItalicTestComponent {}

describe('BsItalicPipe', () => {
  let component: BsItalicTestComponent;
  let fixture: ComponentFixture<BsItalicTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Pipe to test
        BsItalicPipe,

        // Testbench
        BsItalicTestComponent
      ],
      providers: []
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsItalicTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the right html', () => {
    const spanElement = fixture.debugElement.query(By.css('span'));
    expect(spanElement).toBeTruthy();
    expect(spanElement.nativeElement.innerHTML).toBe('<i>Hello world</i>');
  });
});
