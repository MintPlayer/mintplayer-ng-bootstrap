import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTabControlComponent } from '../tab-control/tab-control.component';

import { BsTabPageComponent } from './tab-page.component';

describe('BsTabPageComponent', () => {
  let component: BsTabPageComponent;
  let fixture: ComponentFixture<BsTabPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Component to test
        BsTabPageComponent,

        // Testbench
        BsTabControlTestComponent,

        // Mock components
        BsTabControlMockComponent,
      ],
      providers: [
        { provide: BsTabControlComponent, useClass: BsTabControlMockComponent }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTabPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-tab-control-test',
  template: `
    <bs-tab-control>
      <bs-tab-page>
        <ng-template>
          <span class="triangle mr-2"></span>
          Tab 1
        </ng-template>
        This is tab 1
      </bs-tab-page>
      <bs-tab-page>
        <ng-template>
          <span class="triangle mr-2"></span>
          Tab 2
        </ng-template>
        This is tab 2
      </bs-tab-page>
      <bs-tab-page [disabled]="true">
        <ng-template>
          <span class="triangle mr-2"></span>
          Tab 3
        </ng-template>
        This is tab 3
      </bs-tab-page>
      <bs-tab-page>
        <ng-template>
          <span class="triangle mr-2"></span>
          Tab 4
        </ng-template>
        This is tab 4
      </bs-tab-page>
    </bs-tab-control>`
})
class BsTabControlTestComponent {

  ngOnInit() {
  }

}

@Component({
  selector: 'bs-tab-control',
  template: 'tab-control works'
})
class BsTabControlMockComponent {

  ngOnInit() {
  }

}

