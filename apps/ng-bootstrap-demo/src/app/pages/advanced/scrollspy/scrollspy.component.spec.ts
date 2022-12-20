import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsScrollspyModule } from '@mintplayer/ng-bootstrap/scrollspy';
import { MockModule } from 'ng-mocks';
import { ScrollspyComponent } from './scrollspy.component';

describe('ScrollspyComponent', () => {
  let component: ScrollspyComponent;
  let fixture: ComponentFixture<ScrollspyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsScrollspyModule),
      ],
      declarations: [
        // Unit to test
        ScrollspyComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScrollspyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
