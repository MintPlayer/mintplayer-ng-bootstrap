import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForDirectiveComponent } from './for-directive.component';

@Directive({
  selector: '[bsFor]'
})
class BsForDirective {

  @Input() bsFor: any;

}

describe('ForDirectiveComponent', () => {
  let component: ForDirectiveComponent;
  let fixture: ComponentFixture<ForDirectiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        ForDirectiveComponent,
        
        // Mock dependencies
        BsForDirective
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
