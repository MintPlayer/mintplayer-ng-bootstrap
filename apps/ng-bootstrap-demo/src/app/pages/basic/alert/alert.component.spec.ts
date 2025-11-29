import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';
import { AlertComponent } from './alert.component';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        FormsModule,
        MockModule(BsFormModule),
        MockModule(BsAlertModule),
        MockComponent(BsInputGroupComponent),
        MockDirective(BsButtonTypeDirective),

        // Unit to test (standalone)
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
