import type { AccordionOptions } from '@mintplayer/ui-core/accordion';
import type { InjectionKey, Ref, ShallowRef } from 'vue';

/** What a `BsAccordion` hands its items: the core options and its root element. */
export interface AccordionContext {
  readonly options: Ref<AccordionOptions>;
  readonly root: Readonly<ShallowRef<HTMLDivElement | null>>;
}

export const ACCORDION_CONTEXT: InjectionKey<AccordionContext> = Symbol('bs-accordion');
