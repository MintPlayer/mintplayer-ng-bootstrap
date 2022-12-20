import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { MockModule } from 'ng-mocks';
import { ButtonGroupComponent } from './button-group.component';

describe('ButtonGroupComponent', () => {
  let component: ButtonGroupComponent;
  let fixture: ComponentFixture<ButtonGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsButtonGroupModule),
        MockModule(BsButtonTypeModule),
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
