import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

@Component({
  selector: 'bs-card',
  template: 'card works'
})
class BsCardMockComponent {}

@Component({
  selector: 'bs-card-header',
  template: 'card-header works'
})
class BsCardHeaderMockComponent {}

@Component({
  selector: 'bs-list-group',
  template: 'list-group works'
})
class BsListGroupMockComponent {}

@Component({
  selector: 'bs-list-group-item',
  template: 'list-group-item works'
})
class BsListGroupItemMockComponent {}


describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        CardComponent,
        
        // Mock dependencies
        BsCardMockComponent,
        BsCardHeaderMockComponent,
        BsListGroupMockComponent,
        BsListGroupItemMockComponent
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
