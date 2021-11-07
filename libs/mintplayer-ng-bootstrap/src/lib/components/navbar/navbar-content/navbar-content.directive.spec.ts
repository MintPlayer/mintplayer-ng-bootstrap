import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsNavbarContentDirective } from './navbar-content.directive';

@Component({
  selector: 'navbar-content-test-component',
  template: `
    <div #wrapper>
      <bs-navbar #nav>
      </bs-navbar>
      <div [navbarContent]="nav" #content>
      </div>
    </div>`
})
class NavbarContentTestComponent {
  @ViewChild('wrapper') wrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('nav') nav!: BsNavbarComponent;
  @ViewChild('content') content!: ElementRef<HTMLDivElement>;
}

@Component({
  selector: 'bs-navbar',
  template: `
    <nav #nav>
    </nav>`
})
class BsNavbarComponent {

}

fdescribe('NavbarContentDirective', () => {
  let fixture: ComponentFixture<NavbarContentTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        // Unit to test
        BsNavbarContentDirective,

        // Mock dependencies
        BsNavbarComponent,

        // Testbench
        NavbarContentTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarContentTestComponent);

    fixture.detectChanges();
  });

  it('add a padding to the content element', () => {
    let content = fixture.componentInstance.content.nativeElement;
    let paddingTop = parseInt(content.style.paddingTop.replace('px', ''));
    expect(paddingTop).toBeGreaterThan(25);
  });
});
