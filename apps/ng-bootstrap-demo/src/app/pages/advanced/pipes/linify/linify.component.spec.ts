import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinifyComponent } from './linify.component';

describe('LinifyComponent', () => {
  let component: LinifyComponent;
  let fixture: ComponentFixture<LinifyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LinifyComponent]
    });
    fixture = TestBed.createComponent(LinifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
