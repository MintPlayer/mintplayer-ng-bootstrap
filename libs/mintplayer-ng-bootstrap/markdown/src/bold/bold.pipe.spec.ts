import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsBoldPipe } from './bold.pipe';

@Component({
  selector: 'bs-bold-test',
  standalone: false,
  template: `<span [innerHTML]="'**Hello world**' | bsBold"></span>`
})
class BsBoldTestComponent {}

describe('BsBoldPipe', () => {
  let component: BsBoldTestComponent;
  let fixture: ComponentFixture<BsBoldTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Pipe to test
        BsBoldPipe,
      ],
      declarations: [
        // Testbench
        BsBoldTestComponent
      ],
      providers: []
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsBoldTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the right html', () => {
    const spanElement = fixture.debugElement.query(By.css('span'));
    expect(spanElement).toBeTruthy();
    expect(spanElement.nativeElement.innerHTML).toBe('<b>Hello world</b>');
  });
});
