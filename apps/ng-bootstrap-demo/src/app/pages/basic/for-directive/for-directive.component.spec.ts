import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsForTestingModule, BsGridTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { ForDirectiveComponent } from './for-directive.component';

describe('ForDirectiveComponent', () => {
  let component: ForDirectiveComponent;
  let fixture: ComponentFixture<ForDirectiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsForTestingModule,
        BsGridTestingModule,
      ],
      declarations: [
        // Unit to test
        ForDirectiveComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ForDirectiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
