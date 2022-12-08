import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExtraOptions, ROUTER_CONFIGURATION } from '@angular/router';

import { BsScrollspyComponent } from './scrollspy.component';

describe('BsScrollspyComponent', () => {
  let component: BsScrollspyComponent;
  let fixture: ComponentFixture<BsScrollspyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsScrollspyComponent ],
      providers: [{
        provide: ROUTER_CONFIGURATION,
        useValue: <ExtraOptions>{
          scrollOffset: [0, 56]
        }
      }]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsScrollspyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
