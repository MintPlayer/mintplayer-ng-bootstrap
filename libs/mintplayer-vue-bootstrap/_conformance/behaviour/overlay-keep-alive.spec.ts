import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, onMounted, ref } from 'vue';

import { BsModal } from '@mintplayer/vue-bootstrap/modal';
import { BsTooltip } from '@mintplayer/vue-bootstrap/tooltip';

import { mountWrapper } from './harness';

/**
 * #465 M5 O1/O7: an overlay's consumer content is created on the first open and
 * kept across close → reopen (its own state survives); unmounting the owner
 * removes the content and its body host.
 */

const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

let mounts = 0;
const Probe = defineComponent({
  setup() {
    const bumps = ref(0);
    onMounted(() => void mounts++);
    return () => h('button', { class: 'probe', 'data-bumps': bumps.value, onClick: () => bumps.value++ }, 'probe');
  },
});

const probe = () => document.body.querySelector<HTMLElement>('.probe');

describe('Vue overlay keep-alive (#465)', () => {
  it('O1/O7: a modal keeps its content across close and reopen, and removes it on unmount', async () => {
    mounts = 0;
    const wrapper = mountWrapper(BsModal, { props: { open: true }, slots: { default: () => h(Probe) } });
    await settle();
    const first = probe();
    expect(first).not.toBeNull();
    first!.click();
    await wrapper.setProps({ open: false });
    await settle();
    expect(probe()).toBe(first);
    expect(first!.closest('.modal')?.hasAttribute('hidden')).toBe(true);
    await wrapper.setProps({ open: true });
    await settle();
    expect(probe()).toBe(first);
    expect(probe()!.getAttribute('data-bumps')).toBe('1');
    expect(mounts).toBe(1);
    wrapper.unmount();
    await settle();
    expect(probe()).toBeNull();
    expect(document.body.querySelector('[data-mp-overlay]')).toBeNull();
  });

  it('O1/O7: a tooltip keeps its content across hide and show, and removes it with the trigger', async () => {
    mounts = 0;
    const wrapper = mountWrapper(BsTooltip, {
      slots: {
        default: ({ props }: { props: Record<string, unknown> }) => h('button', { ...props, class: 'trigger' }, 'trigger'),
        content: () => h(Probe),
      },
    });
    await settle();
    const trigger = document.body.querySelector<HTMLElement>('.trigger')!;
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    const first = probe();
    expect(first).not.toBeNull();
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle();
    expect(probe()).toBe(first);
    expect(first!.closest('.tooltip')?.hasAttribute('hidden')).toBe(true);
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    expect(probe()).toBe(first);
    expect(mounts).toBe(1);
    wrapper.unmount();
    await settle();
    expect(probe()).toBeNull();
    expect(document.body.querySelector('[data-mp-overlay]')).toBeNull();
  });
});
