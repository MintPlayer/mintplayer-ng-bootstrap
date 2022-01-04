import { Overlay } from '@angular/cdk/overlay';
import { Component, Injectable, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTooltipDirective } from './tooltip.directive';

enum Position { top, left, bottom, right }

@Component({
  selector: 'bs-tooltip-directive-test',
  template: `
    <button class="btn btn-primary">
        Bottom
        <div class="text-nowrap" *bsTooltip="tooltipPosition.bottom">
            Hello <b>world</b>
            <br>
            This is me
        </div>
    </button>`,
})
class BsTooltipDirectiveTestComponent {
  @ViewChild('tooltipTemplate') tooltipTemplate!: TemplateRef<any>;
  tooltipPosition = Position;

}

@Injectable({ providedIn: 'root' })
class OverlayMock { }

describe('BsTooltipDirective', () => {
  let component: BsTooltipDirectiveTestComponent;
  let fixture: ComponentFixture<BsTooltipDirectiveTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsTooltipDirective,

        // Testbench
        BsTooltipDirectiveTestComponent,
      ],
      providers: [{
        provide: Overlay,
        useClass: OverlayMock
      }]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTooltipDirectiveTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
