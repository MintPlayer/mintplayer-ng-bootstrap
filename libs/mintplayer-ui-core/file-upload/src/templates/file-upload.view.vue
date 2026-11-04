<script setup lang="ts">
// The file upload (#458 M7), compiled into the Angular, React, Vue and Lit fronts.
// `view` comes from connectFileUpload(). The `fileTemplate` slot replaces a row's
// default content (name, size and progress bar).
import type { FileUpload, FileUploadView } from '@mintplayer/ui-core/file-upload';

defineProps<{ view: FileUploadView }>();
defineSlots<{ fileTemplate?: (props: { upload: FileUpload }) => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div mp-attrs v-bind="view.zone">
      <input v-bind="view.input" />
      <span v-bind="view.caption">{{ view.dropFilesCaption }}</span>
      <label v-bind="view.browse">{{ view.browseFilesCaption }}</label>
    </div>
    <ul v-bind="view.list">
      <li v-for="row in view.rows" :key="row.key" v-bind="row.item">
        <slot name="fileTemplate" :upload="row.upload">
          <div class="file-upload-row d-flex flex-row">
            <div class="file-upload-icon" aria-hidden="true"></div>
            <div class="flex-grow-1 text-start px-2">
              <span class="d-block text-truncate text-secondary">{{ row.name }}</span>
              <span class="d-block text-body-secondary mb-0">{{ row.size }}</span>
              <div v-bind="row.progress">
                <div v-bind="row.bar" :style="row.barStyle"></div>
              </div>
            </div>
          </div>
        </slot>
      </li>
    </ul>
  </div>
</template>
