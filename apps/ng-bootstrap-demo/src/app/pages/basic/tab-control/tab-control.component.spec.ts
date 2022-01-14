import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabControlComponent } from './tab-control.component';

@Component({
  selector: 'bs-tab-control',
  template: 'tab-control works'
})
class BsTabControlMockComponent {

  @Input() border = true;

}

@Component({
  selector: 'bs-tab-page',
  template: 'tab-page works'
})
class BsTabPageMockComponent {
  
  @Input() disabled = false;

}

describe('TabControlComponent', () => {
  let component: TabControlComponent;
  let fixture: ComponentFixture<TabControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        TabControlComponent,
      
        // Mock dependencies
        BsTabControlMockComponent,
        BsTabPageMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
