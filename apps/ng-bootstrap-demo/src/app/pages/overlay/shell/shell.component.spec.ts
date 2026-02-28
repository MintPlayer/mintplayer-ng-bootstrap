import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ShellComponent } from './shell.component';
import { MockComponent, MockDirective } from 'ng-mocks';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,

        // Unit to test
        ShellComponent,

        // Mock dependencies
        MockComponent(BsAccordionComponent), MockComponent(BsAccordionTabComponent), MockComponent(BsAccordionTabHeaderComponent),
        MockComponent(BsButtonGroupComponent),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonGroupDirective),
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
