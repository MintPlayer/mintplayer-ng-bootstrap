import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';
import { MockModule } from 'ng-mocks';
import { AlertComponent } from './alert.component';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsFormModule),
        MockModule(BsAlertModule),
        MockModule(BsInputGroupModule),
        MockModule(BsButtonTypeDirective),
        MockModule(BsTrackByModule),
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
