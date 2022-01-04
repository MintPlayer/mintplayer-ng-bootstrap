import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTooltipComponent } from './tooltip.component';

@Component({
  selector: 'bs-tooltip-test',
  template: `
  <ng-template #tooltipTemplate>
    Hello <b>world</b>
    <br />
    This is me
  </ng-template>`,
})
class BsTooltipTestComponent {
  @ViewChild('tooltipTemplate') tooltipTemplate!: TemplateRef<any>;
}

describe('BsTooltipComponent', () => {
  let component: BsTooltipTestComponent;
  let fixture: ComponentFixture<BsTooltipTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsTooltipComponent,

        // Testbench
        BsTooltipTestComponent,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTooltipTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
