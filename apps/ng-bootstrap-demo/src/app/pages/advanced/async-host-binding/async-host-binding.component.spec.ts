import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AsyncHostBindingComponent, HelloComponent } from './async-host-binding.component';
import { MockComponent } from 'ng-mocks';
import { provideAsyncHostBindings } from '@mintplayer/ng-bootstrap/async-host-binding';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';

describe('AsyncHostBindingComponent', () => {
  let component: AsyncHostBindingComponent;
  let fixture: ComponentFixture<AsyncHostBindingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockComponent(BsAlertComponent), MockComponent(BsAlertCloseComponent),
        MockComponent(HelloComponent),
        AsyncHostBindingComponent,
      ],
      providers: [
        provideAsyncHostBindings()
      ]
    });
    fixture = TestBed.createComponent(AsyncHostBindingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
