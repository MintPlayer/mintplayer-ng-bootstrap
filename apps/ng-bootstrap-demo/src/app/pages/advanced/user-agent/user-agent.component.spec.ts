import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAgentComponent } from './user-agent.component';

describe('UserAgentComponent', () => {
  let component: UserAgentComponent;
  let fixture: ComponentFixture<UserAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserAgentComponent ]
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
