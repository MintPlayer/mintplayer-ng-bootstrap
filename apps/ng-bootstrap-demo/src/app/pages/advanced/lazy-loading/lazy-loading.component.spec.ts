import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsLazyLoadingModule } from '@mintplayer/ng-bootstrap/lazy-loading';
import { MockModule } from 'ng-mocks';

import { LazyLoadingComponent } from './lazy-loading.component';

describe('LazyLoadingComponent', () => {
  let component: LazyLoadingComponent;
  let fixture: ComponentFixture<LazyLoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsLazyLoadingModule),
      ],
      declarations: [
        LazyLoadingComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LazyLoadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
