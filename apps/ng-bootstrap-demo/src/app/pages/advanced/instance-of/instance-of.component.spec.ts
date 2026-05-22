import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MockDirective, MockPipe } from 'ng-mocks';

import { InstanceOfComponent } from './instance-of.component';
import { BsInstanceOfDirective, BsInstanceofCaseDirective, BsInstanceOfDefaultDirective, BsInstanceofPipe } from '@mintplayer/ng-bootstrap/instance-of';

describe('InstanceOfComponent', () => {
  let component: InstanceOfComponent;
  let fixture: ComponentFixture<InstanceOfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsInstanceOfDirective), MockDirective(BsInstanceofCaseDirective), MockDirective(BsInstanceOfDefaultDirective), MockPipe(BsInstanceofPipe),
        InstanceOfComponent,
      ],
      providers: [
        provideNoopAnimations(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstanceOfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
