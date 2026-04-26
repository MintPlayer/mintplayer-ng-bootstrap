import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AsyncHostBindingComponent, HelloComponent, RxjsHostComponent } from './async-host-binding.component';
import { MockComponent } from 'ng-mocks';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

describe('AsyncHostBindingComponent', () => {
  let component: AsyncHostBindingComponent;
  let fixture: ComponentFixture<AsyncHostBindingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockComponent(BsAlertComponent), MockComponent(BsAlertCloseComponent),
        MockComponent(BsCodeSnippetComponent),
        MockComponent(HelloComponent),
        MockComponent(RxjsHostComponent),
        AsyncHostBindingComponent,
      ],
    });
    fixture = TestBed.createComponent(AsyncHostBindingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
