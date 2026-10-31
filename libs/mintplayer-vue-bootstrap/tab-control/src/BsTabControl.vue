<script lang="ts">
import { defineComponent, h, onMounted, ref, shallowRef, useId, type PropType, type VNode } from 'vue';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  TAB_CONTROL_SCOPE,
  connectTabControl,
  resolveActiveTab,
  tabControlChanged,
  tabControlKeydown,
  tabControlScopedStyles,
  tabControlTabClick,
  type TabsPosition,
} from '@mintplayer/ui-core/tab-control';
import BsTabPage from './BsTabPage.vue';
import { bootstrapNav, installBootstrap } from '@mintplayer/ui-core/bootstrap';

type PageSlots = { header?: () => VNode[]; default?: () => VNode[] };

/** `<BsTabPage disabled>` arrives as `''` on the raw vnode props. */
const flag = (value: unknown) => value === '' || value === true || value === 'true';

/**
 * `BsTabControl` — Bootstrap nav-tabs over one native radio per tab (#437).
 *
 *     <BsTabControl v-model="tab">
 *       <BsTabPage tab-id="home"><template #header>Home</template>Home content</BsTabPage>
 *       <BsTabPage tab-id="profile" disabled>…</BsTabPage>
 *     </BsTabControl>
 *
 * Renders the markup of `@mintplayer/ui-core/tab-control`, so the server
 * HTML is a working tab control with JavaScript off. After mount the labels
 * become APG tabs (roving tabindex, automatic activation). A render function,
 * because the pages are read from the default slot's vnodes.
 */
export default defineComponent({
  name: 'BsTabControl',
  inheritAttrs: false,
  props: {
    /** The shown page's `tab-id` (v-model). */
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    border: { type: Boolean, default: true },
    selectFirstTab: { type: Boolean, default: true },
    tabsPosition: { type: String as PropType<TabsPosition>, default: 'top' },
  },
  emits: { 'update:modelValue': (_tabId: string) => true },
  setup(props, { slots, emit, attrs }) {
    installBootstrap(bootstrapNav);
    installLightStyles(TAB_CONTROL_SCOPE, tabControlScopedStyles);

    // useId: the same on the server and at hydration.
    const id = `bs-tab-control-${useId()}`;
    const root = shallowRef<HTMLDivElement | null>(null);
    const picked = ref<string | null>(null);
    // Server HTML and the hydrating render are the radio tier; tabs after mount.
    const enhanced = ref(false);
    onMounted(() => (enhanced.value = true));

    return () => {
      const pages = (slots.default?.() ?? [])
        .flatMap((node) => (Array.isArray(node.children) && typeof node.type === 'symbol' ? (node.children as VNode[]) : [node]))
        .filter((node) => node.type === BsTabPage)
        .map((node, index) => {
          // The page's other attributes land on its pane, except `role` (the core's).
          const { tabId, 'tab-id': tabIdAttr, disabled, role: _role, ...attrs } = (node.props ?? {}) as Record<string, unknown>;
          const key = ((tabId ?? tabIdAttr) as string | undefined) ?? String(index);
          return { key, disabled: flag(disabled), attrs, slots: (node.children ?? {}) as PageSlots };
        });
      const states = pages.map((page) => ({ disabled: page.disabled }));
      const requested = props.modelValue ?? picked.value;
      const requestedIndex = requested === null ? -1 : pages.findIndex((page) => page.key === requested);
      const active = resolveActiveTab(states, requestedIndex < 0 ? null : requestedIndex, props.selectFirstTab);
      const view = connectTabControl(
        { id, tabsPosition: props.tabsPosition, border: props.border, enhanced: enhanced.value },
        states,
        active,
      );

      const select = (index: number) => {
        const page = pages[index];
        if (!page || page.disabled) return;
        picked.value = page.key;
        emit('update:modelValue', page.key);
      };

      const strip = h('div', view.strip, [
        h('ul', view.list, pages.map((page, index) =>
          h('li', { key: page.key, ...view.item }, [
            h('label', {
              ...view.tabs[index].tab,
              // A consumer id on a page replaces the pane's, so the IDREF follows it.
              ...(page.attrs['id'] && view.tabs[index].tab['aria-controls'] ? { 'aria-controls': page.attrs['id'] } : {}),
              onClick: (event: Event) => enhanced.value && tabControlTabClick(event, page.disabled) && select(index),
              onKeydown: (event: KeyboardEvent) => {
                const target = root.value && tabControlKeydown(root.value, event, index, states);
                if (target !== null && target !== undefined) select(target);
              },
            }, page.slots.header?.()),
          ]),
        )),
      ]);

      return h('div', {
        ref: root,
        ...view.root,
        ...attrs,
        class: [view.root.class, attrs['class']],
        onChange: (event: Event) => {
          const index = root.value && tabControlChanged(root.value, event);
          if (index !== null && index !== undefined) select(index);
        },
      }, [
        ...pages.map((page, index) => h('input', { key: page.key, ...view.tabs[index].radio, checked: index === active })),
        props.tabsPosition !== 'bottom' ? strip : null,
        h('div', view.content, pages.map((page, index) =>
          h('div', {
            key: page.key,
            ...view.tabs[index].pane,
            ...page.attrs,
            class: [view.tabs[index].pane.class, page.attrs['class']],
          }, page.slots.default?.()),
        )),
        props.tabsPosition === 'bottom' ? strip : null,
      ]);
    };
  },
});
</script>
