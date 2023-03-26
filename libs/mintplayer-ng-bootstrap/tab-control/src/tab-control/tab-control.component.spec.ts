import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsLetModule } from '@mintplayer/ng-bootstrap/let';
import { MockModule } from 'ng-mocks';

import { BsTabControlComponent } from './tab-control.component';

describe('BsTabControlComponent', () => {
  let component: BsTabControlComponent;
  let fixture: ComponentFixture<BsTabControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(DragDropModule),
        MockModule(BsLetModule),
      ],
      declarations: [
        // Component to test
        BsTabControlComponent,

        // Testbench
        BsTabControlTestComponent,

        // Mock components
        BsTabPageMockComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTabControlComponent);
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
  selector: 'bs-tab-page',
  template: 'tab-page works'
})
class BsTabPageMockComponent {

  ngOnInit() {
  }

}

