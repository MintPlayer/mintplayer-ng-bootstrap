<script setup lang="ts">
// The datetime picker's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectDatetimePicker(). The grid
// repeats calendar.view.vue and the list time-list.view.vue (a template cannot
// include another component); keep them in step.
import type { DatetimePickerView } from '@mintplayer/ui-core/datetime-picker';

defineProps<{ view: DatetimePickerView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <div v-bind="view.group">
    <input v-bind="view.input" />
    <input v-if="view.hidden" v-bind="view.hidden" />
    <button v-if="view.clear" v-bind="view.clear"></button>
    <button v-if="view.dateTrigger" v-bind="view.dateTrigger"></button>
    <button v-if="view.timeTrigger" v-bind="view.timeTrigger"></button>
  </div>
  <div v-if="view.showFeedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  <div v-bind="view.live">{{ view.liveText }}</div>
  <div v-bind="view.datePopup">
    <div v-bind="view.calendar.root">
      <div v-bind="view.calendar.nav">
        <button v-bind="view.calendar.previous"></button>
        <span v-bind="view.calendar.monthLabel">{{ view.calendar.monthText }}</span>
        <button v-bind="view.calendar.next"></button>
      </div>
      <table v-bind="view.calendar.grid">
        <tbody>
          <tr v-bind="view.calendar.headRow">
            <th v-bind="view.calendar.weekHeader"><span v-bind="view.calendar.weekHeaderText">{{ view.calendar.weekLabel }}</span></th>
            <th v-for="day in view.calendar.weekdays" :key="day.key" v-bind="day.bag">{{ day.text }}</th>
          </tr>
          <tr v-for="week in view.calendar.weeks" :key="week.key" v-bind="week.row">
            <th v-bind="week.header">{{ week.number }}</th>
            <td v-for="cell in week.cells" :key="cell.key" v-bind="cell.cell"><span v-if="cell.content" v-bind="cell.content">{{ cell.text }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-bind="view.dateFooter">
      <button v-bind="view.today">{{ view.todayText }}</button>
    </div>
  </div>
  <div v-bind="view.timePopup">
    <div v-bind="view.timeList.root">
      <ul v-bind="view.timeList.list">
        <li v-for="slot in view.timeList.slots" :key="slot.key" v-bind="slot.item"><button v-bind="slot.option">{{ slot.text }}</button></li>
      </ul>
    </div>
    <div v-bind="view.timeFooter">
      <button v-bind="view.now">{{ view.nowText }}</button>
    </div>
  </div>
  </div>
</template>
