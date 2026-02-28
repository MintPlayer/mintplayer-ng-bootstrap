import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { MockDirective, MockComponent } from 'ng-mocks';
import { TabControlComponent } from './tab-control.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective } from '@mintplayer/ng-bootstrap/tab-control';
import { BsSelectComponent, BsSelectValueAccessor, BsSelectOption } from '@mintplayer/ng-bootstrap/select';

describe('TabControlComponent', () => {
  let component: TabControlComponent;
  let fixture: ComponentFixture<TabControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsTabControlComponent), MockComponent(BsTabPageComponent), MockDirective(BsTabPageHeaderDirective),
        MockDirective(BsForDirective),
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsGridColDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsSelectComponent), MockDirective(BsSelectValueAccessor), MockDirective(BsSelectOption),
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonValueAccessor), MockDirective(BsToggleButtonGroupDirective),

        // Unit to test (standalone)
        TabControlComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabControlComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
