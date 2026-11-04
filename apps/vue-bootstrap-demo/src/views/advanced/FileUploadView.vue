<script setup lang="ts">
import { onBeforeUnmount, ref, type Ref } from 'vue';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import { BsFileUpload, type FileUpload } from '@mintplayer/vue-bootstrap/file-upload';

const files = ref<FileUpload[]>([]);
const customFiles = ref<FileUpload[]>([]);
const lists: Record<'files' | 'customFiles', Ref<FileUpload[]>> = { files, customFiles };
const timers = new Set<ReturnType<typeof setInterval>>();
onBeforeUnmount(() => [...timers].forEach((timer) => clearInterval(timer)));

/** Simulates an upload: a tenth of each new file every half second. */
function upload(key: keyof typeof lists, added: FileUpload[]) {
  const list = lists[key];
  const indices = new Set(added.map((u) => u.index));
  let steps = 0;
  const timer = setInterval(() => {
    list.value = list.value.map((u) => indices.has(u.index)
      ? { ...u, progress: Math.min(u.file.size, u.progress + Math.max(1, u.file.size / 10)) }
      : u);
    if (++steps >= 10) {
      clearInterval(timer);
      timers.delete(timer);
    }
  }, 500);
  timers.add(timer);
}

function remove(item: FileUpload) {
  customFiles.value = customFiles.value.filter((u) => u !== item);
}

const SOURCE = `<BsFileUpload v-model:files="files" @files-dropped="upload" />`;

const CUSTOM_SOURCE = `<BsFileUpload v-model:files="files" @files-dropped="upload">
  <template #fileTemplate="{ upload }">
    <span>{{ upload.file.name }}</span>
    <button type="button" @click="remove(upload)">Remove</button>
  </template>
</BsFileUpload>`;
</script>

<template>
  <div class="demo-page">
    <h1>File upload</h1>
    <p class="text-body-secondary">
      <code>BsFileUpload</code> is a drop zone over a native file input: drop files on it, click it or use the browse
      button. Each batch is added to <code>v-model:files</code>, reported through <code>@files-dropped</code> and
      announced to screen readers. Rows show the name, size and a progress bar you update; the
      <code>fileTemplate</code> slot replaces a row. With <code>name</code> the input submits its files with a form, no
      JavaScript needed.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsFileUpload v-model:files="files" @files-dropped="(added: FileUpload[]) => upload('files', added)" />
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>

    <section>
      <h2>Custom rows</h2>
      <BsFileUpload v-model:files="customFiles" @files-dropped="(added: FileUpload[]) => upload('customFiles', added)">
        <template #fileTemplate="{ upload: item }">
          <div class="d-flex align-items-center gap-2">
            <span class="flex-grow-1 text-truncate">{{ item.file.name }}</span>
            <span class="text-body-secondary">{{ item.progress >= item.file.size ? 'Done' : 'Uploading…' }}</span>
            <button type="button" class="btn btn-sm btn-outline-danger" @click="remove(item)">Remove</button>
          </div>
        </template>
      </BsFileUpload>
      <BsCodeSnippet :code="CUSTOM_SOURCE" language="html" />
    </section>
  </div>
</template>
