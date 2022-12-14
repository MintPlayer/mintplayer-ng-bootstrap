import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTabControlTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { TabControlComponent } from './tab-control.component';

describe('TabControlComponent', () => {
  let component: TabControlComponent;
  let fixture: ComponentFixture<TabControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsTabControlTestingModule,
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
