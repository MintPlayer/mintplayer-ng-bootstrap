import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AsyncHostBindingComponent, HelloComponent } from './async-host-binding.component';
import { MockComponent, MockModule } from 'ng-mocks';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { provideAsyncHostBindings } from '@mintplayer/ng-bootstrap/async-host-binding';

describe('AsyncHostBindingComponent', () => {
  let component: AsyncHostBindingComponent;
  let fixture: ComponentFixture<AsyncHostBindingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockModule(BsAlertModule),
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
