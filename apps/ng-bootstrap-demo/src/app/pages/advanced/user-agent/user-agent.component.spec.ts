import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { MockModule } from 'ng-mocks';

import { UserAgentComponent } from './user-agent.component';

describe('UserAgentComponent', () => {
  let component: UserAgentComponent;
  let fixture: ComponentFixture<UserAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsAlertModule),
        UserAgentComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
