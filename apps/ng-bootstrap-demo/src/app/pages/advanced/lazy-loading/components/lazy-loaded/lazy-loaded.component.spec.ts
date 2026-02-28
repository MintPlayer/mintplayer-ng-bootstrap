import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent, MockDirective } from 'ng-mocks';

import { LazyLoadedComponent } from './lazy-loaded.component';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';

describe('LazyLoadedComponent', () => {
  let component: LazyLoadedComponent;
  let fixture: ComponentFixture<LazyLoadedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        LazyLoadedComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LazyLoadedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
