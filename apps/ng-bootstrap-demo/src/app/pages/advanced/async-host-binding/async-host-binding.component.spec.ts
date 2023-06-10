import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsyncHostBindingComponent, HelloComponent } from './async-host-binding.component';
import { MockComponent, MockModule } from 'ng-mocks';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsAsyncHostBindingModule } from '@mintplayer/ng-bootstrap/async-host-binding';

describe('AsyncHostBindingComponent', () => {
  let component: AsyncHostBindingComponent;
  let fixture: ComponentFixture<AsyncHostBindingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MockModule(BsAlertModule),
        MockModule(BsAsyncHostBindingModule)
      ],
      declarations: [
        AsyncHostBindingComponent,
        MockComponent(HelloComponent)
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
