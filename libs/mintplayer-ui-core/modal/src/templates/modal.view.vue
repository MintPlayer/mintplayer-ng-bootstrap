<script setup lang="ts">
// The modal: nothing where it is declared; the dialog and its backdrop render
// into a body host while open (or transitioning out).
import type { ModalView } from '@mintplayer/ui-core/modal';

defineProps<{ view: ModalView }>();
defineSlots<{
  /** The dialog's title; it names the dialog. */
  header?: () => unknown;
  /** The dialog's body. */
  default?: () => unknown;
  /** The dialog's actions. */
  footer?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <template v-if="view.rendered">
      <teleport to="body">
        <div v-bind="view.modal">
          <div v-bind="view.dialog">
            <div v-bind="view.content">
              <div v-if="$slots.header" v-bind="view.header">
                <h2 v-bind="view.title"><slot name="header" /></h2>
                <button v-if="view.close" v-bind="view.close"></button>
              </div>
              <div v-bind="view.body"><slot /></div>
              <div v-if="$slots.footer" v-bind="view.footer"><slot name="footer" /></div>
            </div>
          </div>
        </div>
        <div v-bind="view.backdrop"></div>
      </teleport>
    </template>
  </div>
</template>
