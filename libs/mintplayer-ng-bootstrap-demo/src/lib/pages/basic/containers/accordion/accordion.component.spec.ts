import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { MockModule } from 'ng-mocks';
import { AccordionComponent } from './accordion.component';

describe('AccordionComponent', () => {
  let component: AccordionComponent;
  let fixture: ComponentFixture<AccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsAccordionModule),
      ],
      declarations: [
        // Unit to test
        AccordionComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
