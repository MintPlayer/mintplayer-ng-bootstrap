<script setup lang="ts">
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import { DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles } from '@mintplayer/ui-core/dropdown-menu';
import {
  NAVBAR_SCOPE,
  attachNavbar,
  connectNavbar,
  connectNavbarBrand,
  navbarScopedStyles,
  setNavbarExpanded,
  type NavbarBreakpoint,
  type NavbarExpandedChangeEventDetail,
  type NavbarLabels,
} from '@mintplayer/ui-core/navbar';
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useId, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';
import NavbarTemplate from './generated/navbar.view.generated.vue';

/**
 * `BsNavbar` — Bootstrap's navbar rendered from the headless
 * `@mintplayer/ui-core/navbar` core (#437), server-side included. The
 * responsive collapse is a checkbox and every dropdown a native `<details>`,
 * so the bar works with JavaScript off.
 *
 *     <BsNavbar breakpoint="lg" color="body-tertiary">
 *       <template #brand><a href="/">MyApp</a></template>
 *       <BsNavbarNav>
 *         <BsNavbarItem active><a href="/">Home</a></BsNavbarItem>
 *       </BsNavbarNav>
 *       <BsNavbarNav align="end">…</BsNavbarNav>
 *     </BsNavbar>
 *
 * Slots: `brand`, `toggler` (a custom hamburger glyph; it reads the open state
 * from `--mp-navbar-expanded: 0|1`) and the default slot for `BsNavbarNav`s.
 */
const props = withDefaults(
  defineProps<{
    /** Bootstrap breakpoint name (`xs`…`xxl`, default `md`); at/above it the nav is inline. */
    breakpoint?: NavbarBreakpoint;
    /** Background: a theme color (`primary`…`dark`) or adaptive `body` / `body-secondary` / `body-tertiary`. */
    color?: string;
    /** Collapse state (narrow mode). Written when it changes; follow the toggle with `expandedchange`. */
    expanded?: boolean;
    /** `fixed` pins the bar to the top of the viewport, full width; omit for in-flow. */
    positioning?: 'fixed';
    /** Localized accessible names; `aria-label` names the landmark too. */
    labels?: Partial<NavbarLabels>;
  }>(),
  { expanded: false },
);

const emit = defineEmits<{ expandedchange: [detail: NavbarExpandedChangeEventDetail] }>();

installLightStyles(NAVBAR_SCOPE, navbarScopedStyles);
installLightStyles(DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles);

// useId, not the instance uid: it matches between the server render and hydration.
const id = `bs-navbar-${useId()}`;
const attrs = useAttrs();
// The markup is the compiled ui-core template; its root element is the <nav>.
const template = useTemplateRef<ComponentPublicInstance>('template');
const root = computed(() => (template.value?.$el as HTMLElement | undefined) ?? null);
const hydrated = ref(false);
const isExpanded = ref(props.expanded);

const view = computed(() => {
  const ariaLabel = attrs['aria-label'] as string | undefined;
  return connectNavbar({
    id,
    breakpoint: props.breakpoint,
    color: props.color,
    positioning: props.positioning,
    expanded: isExpanded.value,
    hydrated: hydrated.value,
    labels: { ...(ariaLabel ? { nav: ariaLabel } : {}), ...(props.labels ?? {}) },
  });
});
const brand = connectNavbarBrand();

let detach: (() => void) | undefined;
onMounted(() => {
  hydrated.value = true;
  if (!root.value) return;
  detach = attachNavbar(root.value, {
    onExpandedChange: (next) => {
      isExpanded.value = next;
      emit('expandedchange', { expanded: next });
    },
  });
});
onBeforeUnmount(() => detach?.());

watch(
  () => props.expanded,
  (next) => {
    if (root.value && setNavbarExpanded(root.value, next) !== null) isExpanded.value = next;
  },
);
</script>

<template>
  <NavbarTemplate ref="template" :view="view" :brand="brand">
    <template v-if="$slots.brand" #brand><slot name="brand" /></template>
    <template v-if="$slots.toggler" #toggler><slot name="toggler" /></template>
    <slot />
  </NavbarTemplate>
</template>
