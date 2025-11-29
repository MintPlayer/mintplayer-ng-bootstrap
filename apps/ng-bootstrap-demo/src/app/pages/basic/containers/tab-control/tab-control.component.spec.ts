import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsTabControlModule } from '@mintplayer/ng-bootstrap/tab-control';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { MockDirective, MockModule } from 'ng-mocks';
import { TabControlComponent } from './tab-control.component';

describe('TabControlComponent', () => {
  let component: TabControlComponent;
  let fixture: ComponentFixture<TabControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsTabControlModule),
        MockDirective(BsForDirective),
        MockModule(BsGridModule),
        MockModule(BsSelectModule),
        MockModule(BsToggleButtonModule),

        // Unit to test (standalone)
        TabControlComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
