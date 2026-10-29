import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { trackPopovers } from '@mintplayer/ui-core/overlay';
import {
  connectTimeList,
  connectTimepicker,
  formatTime,
  isoTime,
  minutesOfDay,
  parseIsoTime,
  withTimeOfDay,
  type Hour12Mode,
  type TimeListLabels,
  type TimeListView,
  type TimepickerLabels,
  type TimepickerView,
  type TimeStep,
} from './timepicker';
import { attachTimeList, focusTimeSlot, rovingSlotOf, type TimeListHost } from './timepicker.behaviour';

/**
 * The time list's and the time picker's cores (PRD #437 D10): what the
 * generated Angular, React, Vue and Lit components host.
 * `timepicker.component.ts` is their manifest and `templates/` their markup.
 */

export interface TimeListInputs {
  /** The selected time, two-way. Only its time of day is read; a pick keeps its date. */
  selectedTime: Date | null;
  step: TimeStep;
  /** Earliest selectable slot, in minutes from midnight. */
  minMinutes: number | null;
  /** Latest selectable slot, in minutes from midnight. */
  maxMinutes: number | null;
  hour12: Hour12Mode;
  locale: string | null;
  labels: Partial<TimeListLabels> | null;
}

export interface TimeListState {
  selectedTime: Date | null;
  focusedMinutes: number | null;
}

export interface TimeListEvents {
  /** A slot chosen by click, Enter or Space. */
  selectedTimeChange: Date;
}

export interface TimeListMethods {
  /** Focus the list's roving slot. */
  focusList(): void;
}

type ListApi = CoreApi<TimeListInputs, TimeListState, TimeListEvents>;

const listHost = (api: ListApi, select: (minutes: number) => void): TimeListHost => ({
  selected: () => minutesOfDay(api.state().selectedTime),
  focused: () => api.state().focusedMinutes,
  step: () => api.inputs().step,
  limits: () => api.inputs(),
  setFocused: (minutes) => api.setState({ focusedMinutes: minutes }),
  select,
});

export const timeListCore = defineCore<TimeListInputs, TimeListState, { view: TimeListView }, TimeListEvents, undefined, undefined, TimeListMethods>({
  state: (inputs) => ({ selectedTime: inputs.selectedTime, focusedMinutes: null }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectTimeList({
      id,
      selected: minutesOfDay(state.selectedTime),
      focused: state.focusedMinutes,
      step: inputs.step,
      minMinutes: inputs.minMinutes,
      maxMinutes: inputs.maxMinutes,
      locale: inputs.locale,
      hour12: inputs.hour12,
      hydrated,
      label,
      labels: inputs.labels ?? undefined,
    }),
  }),
  attach: (api) =>
    attachTimeList(
      api.host,
      listHost(api, (minutes) => {
        const time = withTimeOfDay(api.state().selectedTime, minutes);
        api.setState({ selectedTime: time });
        api.emit('selectedTimeChange', time);
      }),
    ),
  inputsChanged: (api, prev) => {
    const { selectedTime } = api.inputs();
    if (selectedTime !== prev.selectedTime && minutesOfDay(selectedTime) !== minutesOfDay(api.state().selectedTime)) {
      api.setState({ selectedTime });
    }
  },
  methods: {
    focusList: (api) => focusTimeSlot(api.host, rovingSlotOf(listHost(api, () => undefined))),
  },
});

export interface TimepickerInputs {
  /** The picked time, two-way. Only its time of day is read; a pick keeps its date. */
  selectedTime: Date | null;
  step: TimeStep;
  /** Earliest selectable time of day (the date part is ignored). */
  min: Date | null;
  /** Latest selectable time of day (the date part is ignored). */
  max: Date | null;
  hour12: Hour12Mode;
  locale: string | null;
  disabled: boolean;
  placeholder: string | null;
  required: boolean;
  /** Marks the field invalid and shows `errorText` under it. */
  invalid: boolean;
  /** The validation message, referenced from the field while `invalid`. */
  errorText: string | null;
  /** Names the field when no `aria-label` does. */
  inputLabel: string | null;
  /** The time submits under this name, as `HH:MM`. */
  name: string | null;
  labels: Partial<TimepickerLabels> | null;
}

export interface TimepickerState {
  selectedTime: Date | null;
  focusedMinutes: number | null;
  open: boolean;
}

export interface TimepickerEvents {
  /** A slot picked in the list, or a time typed into the field before hydration. */
  selectedTimeChange: Date;
  /** The popup opened (true) or closed (false). */
  openChange: boolean;
}

export interface TimepickerMethods {
  open(): void;
  close(): void;
}

type PickerApi = CoreApi<TimepickerInputs, TimepickerState, TimepickerEvents>;

const popupOf = (api: PickerApi) => api.host.querySelector<HTMLElement>('.timepicker-popup');
const fieldOf = (api: PickerApi) => api.host.querySelector<HTMLInputElement>('input.timepicker-input');

/** The field shows the locale's time and the hidden input `HH:MM`: a bag value is only a seed. */
function syncField(api: PickerApi) {
  const minutes = minutesOfDay(api.state().selectedTime);
  const { locale, hour12 } = api.inputs();
  const field = fieldOf(api);
  if (field?.type === 'text') field.value = minutes === null ? '' : formatTime(minutes, locale, hour12);
  const hidden = api.host.querySelector<HTMLInputElement>('input.timepicker-value');
  if (hidden) hidden.value = minutes === null ? '' : isoTime(minutes);
}

const pickerListHost = (api: PickerApi): TimeListHost => ({
  selected: () => minutesOfDay(api.state().selectedTime),
  focused: () => api.state().focusedMinutes,
  step: () => api.inputs().step,
  limits: () => ({ minMinutes: minutesOfDay(api.inputs().min), maxMinutes: minutesOfDay(api.inputs().max) }),
  setFocused: (minutes) => api.setState({ focusedMinutes: minutes }),
  select: (minutes) => {
    const time = withTimeOfDay(api.state().selectedTime, minutes);
    api.setState({ selectedTime: time });
    syncField(api);
    api.emit('selectedTimeChange', time);
    popupOf(api)?.hidePopover?.();
    api.host.querySelector<HTMLElement>('.timepicker-trigger')?.focus();
  },
});

export const timepickerCore = defineCore<TimepickerInputs, TimepickerState, { view: TimepickerView }, TimepickerEvents, undefined, undefined, TimepickerMethods>({
  state: (inputs) => ({ selectedTime: inputs.selectedTime, focusedMinutes: null, open: false }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectTimepicker({
      id,
      selected: minutesOfDay(state.selectedTime),
      focused: state.focusedMinutes,
      open: state.open,
      step: inputs.step,
      minMinutes: minutesOfDay(inputs.min),
      maxMinutes: minutesOfDay(inputs.max),
      locale: inputs.locale,
      hour12: inputs.hour12,
      disabled: inputs.disabled,
      placeholder: inputs.placeholder,
      required: inputs.required,
      invalid: inputs.invalid,
      errorText: inputs.errorText,
      name: inputs.name,
      hydrated,
      label: label ?? inputs.inputLabel,
      labels: inputs.labels ?? undefined,
    }),
  }),
  attach: (api) => {
    const host = api.host;
    // A time typed into the native field before hydration is the user's.
    const field = fieldOf(api);
    const typed = field?.type === 'time' ? parseIsoTime(field.value) : null;
    if (typed !== null && typed !== minutesOfDay(api.state().selectedTime)) {
      const time = withTimeOfDay(api.state().selectedTime, typed);
      api.setState({ selectedTime: time });
      api.emit('selectedTimeChange', time);
    }
    // The field becomes the readonly display now: a time field cannot hold the
    // formatted text, and its dirty value would survive the type change.
    if (field) {
      field.type = 'text';
      field.readOnly = true;
    }
    syncField(api);

    const listHost = pickerListHost(api);
    const onToggle = (event: Event) => {
      if (event.target !== popupOf(api)) return;
      const open = (event as ToggleEvent).newState === 'open';
      if (open === api.state().open) return;
      api.setState({ open, focusedMinutes: open ? api.state().focusedMinutes : null });
      api.emit('openChange', open);
      // APG listbox popup: opening moves focus to the roving option.
      const popup = popupOf(api);
      if (open && popup) focusTimeSlot(popup, rovingSlotOf(listHost));
    };
    const onTriggerKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' || !(event.target as Element).closest?.('.timepicker-trigger')) return;
      event.preventDefault();
      popupOf(api)?.showPopover?.();
    };

    host.addEventListener('toggle', onToggle, { capture: true });
    host.addEventListener('keydown', onTriggerKey);
    const untrack = trackPopovers(host, () => host.querySelector<HTMLElement>('.input-group'), { matchAnchorWidth: true });
    const popup = popupOf(api);
    const unlist = popup ? attachTimeList(popup, listHost) : () => undefined;
    return () => {
      host.removeEventListener('toggle', onToggle, { capture: true });
      host.removeEventListener('keydown', onTriggerKey);
      untrack();
      unlist();
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.selectedTime !== prev.selectedTime && minutesOfDay(inputs.selectedTime) !== minutesOfDay(api.state().selectedTime)) {
      api.setState({ selectedTime: inputs.selectedTime });
    }
    if (inputs.disabled && api.state().open) popupOf(api)?.hidePopover?.();
    syncField(api);
  },
  methods: {
    open: (api) => {
      if (!api.inputs().disabled) popupOf(api)?.showPopover?.();
    },
    close: (api) => popupOf(api)?.hidePopover?.(),
  },
});
