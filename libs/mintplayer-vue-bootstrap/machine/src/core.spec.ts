import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { ComponentCore, CoreApi } from '@mintplayer/ui-core/component';
import { useCore } from './core';

interface Inputs { value: string[] }
interface State { value: string[] }

let api!: CoreApi<Inputs, State, Record<string, unknown>>;

/** Shaped like the tree-select: an array model the core copies when the input differs from its state. */
const listCore = {
  state: (inputs: Inputs) => ({ value: inputs.value }),
  view: () => ({}),
  attach: (a: CoreApi<Inputs, State, Record<string, unknown>>) => {
    api = a;
  },
  inputsChanged: (a: CoreApi<Inputs, State, Record<string, unknown>>, prev: Inputs) => {
    const value = a.inputs().value;
    if (value !== prev.value && value !== a.state().value) a.setState({ value: [...value] });
  },
} as unknown as ComponentCore<Inputs, State, object, Record<string, unknown>, unknown, unknown, unknown>;

describe('useCore (Vue bridge)', () => {
  it('does not echo a v-model array written back through a ref', async () => {
    const List = defineComponent({
      props: { value: { type: Array, required: true } },
      emits: ['update:value'],
      setup(props, { emit }) {
        useCore(listCore, () => ({ value: props.value as string[] }), {
          idPrefix: 'list',
          root: () => document.body,
          emit: (name, detail) => emit(name as 'update:value', detail),
          models: ['value'],
        });
        return () => h('div');
      },
    });
    const model = ref<string[]>([]);
    let writes = 0;
    const Host = defineComponent({
      setup: () => () =>
        h(List, {
          value: model.value,
          // Capped so a regression fails instead of hanging the worker.
          'onUpdate:value': (next: string[]) => {
            if (++writes < 20) model.value = next;
          },
        }),
    });
    const wrapper = mount(Host, { attachTo: document.body });
    await nextTick();

    api.setState({ value: ['a'] });
    await nextTick();
    await nextTick();

    expect(writes).toBe(1);
    expect(model.value).toEqual(['a']);
    wrapper.unmount();
  });
});
