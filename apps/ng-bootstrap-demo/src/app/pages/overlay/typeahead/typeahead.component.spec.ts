import { JsonPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypeaheadComponent } from './typeahead.component';

@Pipe({
  name: 'json'
})
class JsonMockPipe implements PipeTransform {
  transform(value: any, ...args: any[]) {
    return 'json';
  }
}

@Component({
  selector: 'bs-typeahead',
  template: `
    <div>
      <input type="text">
    </div>`
})
class BsTypeaheadMockComponent {
  @Input() searchterm = '';
  @Output() searchtermChange = new EventEmitter<string>();
  @Output() provideSuggestions = new EventEmitter<string>();
  @Input() suggestions: any[] = [];
  @Output() submitted = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<any>();
}

describe('TypeaheadComponent', () => {
  let component: TypeaheadComponent;
  let fixture: ComponentFixture<TypeaheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        TypeaheadComponent,

        // Mock dependencies
        BsTypeaheadMockComponent
      ],
      providers: [
        // Mock dependencies
        { provide: JsonPipe, useClass: JsonMockPipe }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TypeaheadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
