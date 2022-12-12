import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonGroupTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { ButtonGroupComponent } from './button-group.component';

describe('ButtonGroupComponent', () => {
  let component: ButtonGroupComponent;
  let fixture: ComponentFixture<ButtonGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsButtonGroupTestingModule,
      ],
      declarations: [
        // Unit to test
        ButtonGroupComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
