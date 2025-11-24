import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NavbarRouterLinkActiveDirective } from './navbar-router-link-active.directive';

describe('NavbarRouterLinkActiveDirective', () => {
  let component: RouterLinkTestComponent;
  let fixture: ComponentFixture<RouterLinkTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: '', component: PageHomeComponent },
        ]),

        // Pages
        PageHomeComponent,

        // Directive to test
        NavbarRouterLinkActiveDirective,
      ],
      declarations: [
        // Mock dependencies
  
        // Testbench
        RouterLinkTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouterLinkTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
    // expect(component.link.nativeElement.classList.contains('active')).toBe(true);
  });
});

@Component({
  selector: 'router-link-test',
  standalone: false,
  template: `
    <a [routerLink]='["/"]' #link>
      Home
    </a>`
})
class RouterLinkTestComponent {
  @ViewChild('link') link!: ElementRef<HTMLAnchorElement>;
}

@Component({
  selector: 'page-home',
  template: `<div>Home</div>`,
})
class PageHomeComponent {}