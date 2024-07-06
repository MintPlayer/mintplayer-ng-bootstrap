import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { MockComponent, MockModule } from 'ng-mocks';
import { ToggleButtonComponent } from './toggle-button.component';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';

describe('ToggleButtonComponent', () => {
  let component: ToggleButtonComponent;
  let fixture: ComponentFixture<ToggleButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsGridModule),
        MockModule(BsCheckboxModule),
      ],
      declarations: [
        // Unit to test
        ToggleButtonComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToggleButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
