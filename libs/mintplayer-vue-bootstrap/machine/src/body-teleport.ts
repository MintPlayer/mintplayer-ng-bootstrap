import { Teleport, type Component, defineComponent, getCurrentInstance, h, onBeforeUnmount, onMounted, shallowRef, useId } from 'vue';
import { createBodyHost, removeBodyHost } from '@mintplayer/ui-core/overlay';

/**
 * The compiled form of a view's `<teleport to="body">` (#458 §4.4): the default
 * slot renders, through Vue's `<Teleport>`, into a `div[data-mp-overlay]` at the
 * end of `<body>`, outside every clipping ancestor. The host copies the
 * declaring position's `data-bs-theme`, `dir` and `lang`.
 *
 * Client only: until mount it renders a placeholder comment, the same on the
 * server, so an app needs no SSR teleport injection (an overlay cannot be
 * opened without JS).
 */
export const MpBodyTeleport = defineComponent({
  name: 'MpBodyTeleport',
  setup(_, { slots }) {
    const id = `mp-overlay-${useId()}`;
    const instance = getCurrentInstance();
    const host = shallowRef<HTMLElement | null>(null);
    onMounted(() => {
      // The placeholder sits where the teleport was declared: its parent is the declaring element.
      const placeholder = instance?.proxy?.$el as Node | null | undefined;
      host.value = createBodyHost(document, id, placeholder?.parentElement ?? null);
    });
    onBeforeUnmount(() => {
      host.value = null;
      removeBodyHost(document, id);
    });
    // Teleport's h() overload is missing from Vue's types; it takes array children, never a slots object.
    return () => (host.value ? h(Teleport as unknown as Component<{ to: Element }>, { to: host.value }, slots['default']?.() ?? []) : null);
  },
});
