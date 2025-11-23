import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShellComponent } from './shell.component';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        ShellComponent,
      
        // Mock dependencies
        MockModule(BsAccordionModule),
        MockComponent(BsButtonGroupComponent),
        MockDirective(BsButtonTypeDirective),
        MockModule(BsToggleButtonComponent),
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
