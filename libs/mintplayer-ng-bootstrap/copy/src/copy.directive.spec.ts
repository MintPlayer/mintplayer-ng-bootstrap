import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyDirective } from './copy.directive';

const htmlToCopy = 'Hello world';

@Component({
  selector: 'bs-copy-test',
  template: `
    <button #copyBtn [bsCopy]="htmlToCopy" (bsCopied)="copiedHtml()">
      Copy html
    </button>`
})
class BsCopyTestComponent {
  htmlToCopy = htmlToCopy;
  @ViewChild('copyBtn') copyBtn!: ElementRef<HTMLButtonElement>;
}

describe('BsCopyDirective', () => {
  let component: BsCopyTestComponent;
  let fixture: ComponentFixture<BsCopyTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsCopyDirective,

        // Testbench
        BsCopyTestComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsCopyTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

});
