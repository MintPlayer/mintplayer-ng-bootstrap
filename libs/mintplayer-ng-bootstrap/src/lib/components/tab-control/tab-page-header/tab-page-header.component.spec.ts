import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabPageHeaderComponent } from './tab-page-header.component';

describe('TabPageHeaderComponent', () => {
  let component: TabPageHeaderComponent;
  let fixture: ComponentFixture<TabPageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TabPageHeaderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabPageHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
