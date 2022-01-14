import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

@Component({
  selector: 'bs-card',
  template: 'card works'
})
class BsCardMockComponent {
  constructor() {
  }
}

@Component({
  selector: 'bs-card-header',
  template: 'card-header works'
})
class BsCardHeaderMockComponent {
  constructor() {
  }
}


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
        BsCardHeaderMockComponent
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
