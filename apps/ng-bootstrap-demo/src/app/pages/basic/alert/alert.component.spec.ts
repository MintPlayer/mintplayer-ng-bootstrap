import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { MockModule } from 'ng-mocks';
import { AlertComponent } from './alert.component';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsAlertModule),
        MockModule(BsButtonTypeModule),
      ],
      declarations: [
        // Unit to test
        AlertComponent,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
