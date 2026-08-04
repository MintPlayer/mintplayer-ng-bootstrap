// Tree-shaking probe: a consumer that uses a *different* sub-entrypoint must pay
// zero bytes for flags and libphonenumber.
import { MpSelect } from '@mintplayer/web-components/select';

export const probe = MpSelect;
