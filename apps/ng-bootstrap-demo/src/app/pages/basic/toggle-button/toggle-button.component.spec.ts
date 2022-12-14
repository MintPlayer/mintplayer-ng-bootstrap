import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsGridTestingModule, BsToggleButtonTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { ToggleButtonComponent } from './toggle-button.component';

describe('ToggleButtonComponent', () => {
  let component: ToggleButtonComponent;
  let fixture: ComponentFixture<ToggleButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        BsGridTestingModule,
        BsToggleButtonTestingModule,
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
