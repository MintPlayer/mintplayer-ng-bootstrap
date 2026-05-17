import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockDirective } from 'ng-mocks';
import { CardComponent } from './card.component';
import {
  BsCardBodyComponent,
  BsCardComponent,
  BsCardFooterComponent,
  BsCardGroupComponent,
  BsCardHeaderComponent,
  BsCardImgComponent,
  BsCardLinkComponent,
  BsCardSubtitleComponent,
  BsCardTextComponent,
  BsCardTitleComponent,
} from '@mintplayer/ng-bootstrap/card';
import {
  BsGridComponent,
  BsGridColumnDirective,
  BsGridRowDirective,
} from '@mintplayer/ng-bootstrap/grid';
import {
  BsListGroupComponent,
  BsListGroupItemComponent,
} from '@mintplayer/ng-bootstrap/list-group';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsCardComponent),
        MockComponent(BsCardHeaderComponent),
        MockComponent(BsCardBodyComponent),
        MockComponent(BsCardFooterComponent),
        MockComponent(BsCardTitleComponent),
        MockComponent(BsCardSubtitleComponent),
        MockComponent(BsCardTextComponent),
        MockComponent(BsCardLinkComponent),
        MockComponent(BsCardImgComponent),
        MockComponent(BsCardGroupComponent),
        MockComponent(BsListGroupComponent),
        MockComponent(BsListGroupItemComponent),
        MockComponent(BsGridComponent),
        MockDirective(BsGridRowDirective),
        MockDirective(BsGridColumnDirective),
        CardComponent,
      ],
    }).compileComponents();
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
