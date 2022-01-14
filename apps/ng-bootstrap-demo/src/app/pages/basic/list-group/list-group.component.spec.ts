import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListGroupComponent } from './list-group.component';

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

describe('ListGroupComponent', () => {
  let component: ListGroupComponent;
  let fixture: ComponentFixture<ListGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        ListGroupComponent,
      
        // Mock dependencies
        BsListGroupMockComponent,
        BsListGroupItemMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
