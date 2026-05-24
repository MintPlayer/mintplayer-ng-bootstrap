// Side-effect-register <mp-tab-control> + <mp-tab-page> via the upstream entry.
import '@mintplayer/web-components/tab-control';

export { default as BsTabControl } from './BsTabControl.vue';

export {
  MpTabControl,
  MpTabPage,
  type TabActivateEventDetail,
} from '@mintplayer/web-components/tab-control';
