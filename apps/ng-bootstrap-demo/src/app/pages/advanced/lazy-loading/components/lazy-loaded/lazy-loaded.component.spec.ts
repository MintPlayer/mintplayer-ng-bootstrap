import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { MockModule } from 'ng-mocks';

import { LazyLoadedComponent } from './lazy-loaded.component';

describe('LazyLoadedComponent', () => {
  let component: LazyLoadedComponent;
  let fixture: ComponentFixture<LazyLoadedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsFormModule),
      ],
      declarations: [ LazyLoadedComponent ]
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
