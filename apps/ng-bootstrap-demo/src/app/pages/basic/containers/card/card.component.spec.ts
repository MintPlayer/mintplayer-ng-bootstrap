import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { MockModule } from 'ng-mocks';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsCardComponent, BsCardHeaderComponent),
        MockModule(BsListGroupModule),
      ],
      declarations: [
        // Unit to test
        CardComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
