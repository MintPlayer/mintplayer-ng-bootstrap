/**
 * The six exported triggers are pure AnimationTriggerMetadata — consumed by
 * name from component decorators, so a renamed trigger or a changed state
 * expression breaks consumers at runtime with no compile error. These pins
 * assert the contract: trigger names, state/transition expressions, and the
 * overridable default params.
 */
import {
  AnimationMetadataType,
  AnimationStateMetadata,
  AnimationTransitionMetadata,
} from '@angular/animations';
import { describe, expect, it } from 'vitest';

import {
  CarouselSlideAnimation,
  ColorTransitionAnimation,
  EnterFromTopAnimation,
  FadeInOutAnimation,
  SlideUpDownAnimation,
  SlideUpDownNgifAnimation,
} from '../index';

const statesOf = (trigger: { definitions: unknown[] }) =>
  trigger.definitions.filter(
    (d): d is AnimationStateMetadata =>
      (d as AnimationStateMetadata).type === AnimationMetadataType.State,
  );

const transitionsOf = (trigger: { definitions: unknown[] }) =>
  trigger.definitions.filter(
    (d): d is AnimationTransitionMetadata =>
      (d as AnimationTransitionMetadata).type === AnimationMetadataType.Transition,
  );

describe('CarouselSlideAnimation', () => {
  it('is the carouselSlide trigger with a transition per direction', () => {
    expect(CarouselSlideAnimation.name).toBe('carouselSlide');
    expect(transitionsOf(CarouselSlideAnimation).map((t) => t.expr)).toEqual([
      ':decrement',
      ':increment',
    ]);
  });
});

describe('ColorTransitionAnimation', () => {
  it('is the colorTransition trigger with two parameterised color states', () => {
    expect(ColorTransitionAnimation.name).toBe('colorTransition');

    const states = statesOf(ColorTransitionAnimation);
    expect(states.map((s) => s.name)).toEqual(['color1', 'color2']);
    expect(states[0].options?.params).toEqual({ color1: '#000' });
    expect(states[1].options?.params).toEqual({ color2: '#444' });
  });

  it('transitions both ways with an overridable duration', () => {
    const transitions = transitionsOf(ColorTransitionAnimation);
    expect(transitions.map((t) => t.expr)).toEqual(['color1 => color2', 'color2 => color1']);
    for (const t of transitions) {
      expect(t.options?.params).toEqual({ color1: '#000', color2: '#444', duration: '1s' });
    }
  });
});

describe('EnterFromTopAnimation', () => {
  it('is the enterFromTop trigger animating :enter and :leave with a default duration', () => {
    expect(EnterFromTopAnimation.name).toBe('enterFromTop');

    const transitions = transitionsOf(EnterFromTopAnimation);
    expect(transitions.map((t) => t.expr)).toEqual([':enter', ':leave']);
    for (const t of transitions) {
      expect(t.options?.params).toEqual({ duration: '500ms' });
    }
  });
});

describe('FadeInOutAnimation', () => {
  it('is the fadeInOut trigger animating :enter and :leave with a default duration', () => {
    expect(FadeInOutAnimation.name).toBe('fadeInOut');

    const transitions = transitionsOf(FadeInOutAnimation);
    expect(transitions.map((t) => t.expr)).toEqual([':enter', ':leave']);
    for (const t of transitions) {
      expect(t.options?.params).toEqual({ duration: '500ms' });
    }
  });
});

describe('SlideUpDownAnimation', () => {
  it('is the value-bound slideUpDown trigger: height 0 when false, natural when true', () => {
    expect(SlideUpDownAnimation.name).toBe('slideUpDown');

    const states = statesOf(SlideUpDownAnimation);
    expect(states.map((s) => s.name)).toEqual(['false', 'true']);
    expect(states[0].styles.styles).toEqual({ height: 0 });
    expect(states[1].styles.styles).toEqual({ height: '*' });
    expect(transitionsOf(SlideUpDownAnimation).map((t) => t.expr)).toEqual([
      'false => true',
      'true => false',
    ]);
  });
});

describe('SlideUpDownNgifAnimation', () => {
  it('is the structural slideUpDownNgif trigger keyed on :enter/:leave, not a bound value', () => {
    expect(SlideUpDownNgifAnimation.name).toBe('slideUpDownNgif');
    expect(statesOf(SlideUpDownNgifAnimation)).toEqual([]);
    expect(transitionsOf(SlideUpDownNgifAnimation).map((t) => t.expr)).toEqual([
      ':enter',
      ':leave',
    ]);
  });
});
