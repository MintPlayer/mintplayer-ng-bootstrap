import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';
import { BsPlaceholderComponent } from './placeholder.component';

describe('BsPlaceholderComponent', () => {
  let component: BsPlaceholderComponent;
  let fixture: ComponentFixture<BsPlaceholderComponent>;
  let announceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsPlaceholderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsPlaceholderComponent);
    component = fixture.componentInstance;
    announceSpy = vi.spyOn(TestBed.inject(BsLiveAnnouncerService), 'announce');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not announce on initial render when not loading', () => {
    expect(announceSpy).not.toHaveBeenCalled();
  });

  it('announces "Loading complete" when isLoading flips true → false', () => {
    component.isLoading.set(true);
    fixture.detectChanges();
    expect(announceSpy).not.toHaveBeenCalled();

    component.isLoading.set(false);
    fixture.detectChanges();
    expect(announceSpy).toHaveBeenCalledWith('Loading complete');
  });

  it('honours loadingCompleteText override', () => {
    fixture.componentRef.setInput('loadingCompleteText', 'Done loading');
    component.isLoading.set(true);
    fixture.detectChanges();
    component.isLoading.set(false);
    fixture.detectChanges();

    expect(announceSpy).toHaveBeenCalledWith('Done loading');
  });

  it('does not announce on the false → true transition', () => {
    component.isLoading.set(true);
    fixture.detectChanges();
    expect(announceSpy).not.toHaveBeenCalled();
  });
});
