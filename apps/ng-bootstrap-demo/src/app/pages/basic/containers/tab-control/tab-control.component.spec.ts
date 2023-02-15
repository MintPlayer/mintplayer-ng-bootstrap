import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTabControlModule } from '@mintplayer/ng-bootstrap/tab-control';
import { MockModule } from 'ng-mocks';
import { TabControlComponent } from './tab-control.component';

describe('TabControlComponent', () => {
  let component: TabControlComponent;
  let fixture: ComponentFixture<TabControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsTabControlModule),
      ],
      declarations: [
        // Unit to test
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
