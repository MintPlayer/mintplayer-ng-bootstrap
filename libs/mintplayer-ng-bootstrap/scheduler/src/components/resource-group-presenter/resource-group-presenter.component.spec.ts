import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourceGroupPresenterComponent } from './resource-group-presenter.component';

describe('ResourceGroupPresenterComponent', () => {
  let component: ResourceGroupPresenterComponent;
  let fixture: ComponentFixture<ResourceGroupPresenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResourceGroupPresenterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResourceGroupPresenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
