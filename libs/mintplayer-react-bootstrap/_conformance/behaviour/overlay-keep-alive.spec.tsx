import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { BsModal } from '@mintplayer/react-bootstrap/modal';
import { useBsTooltip } from '@mintplayer/react-bootstrap/tooltip';
import { render } from './harness';

/**
 * #465 M5 O1/O7: an overlay's consumer content is created on the first open and
 * kept across close → reopen (its own state survives); unmounting the owner
 * removes the content and its body host.
 */

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

let mounts = 0;
function Probe() {
  const [bumps, setBumps] = React.useState(0);
  React.useEffect(() => void mounts++, []);
  return (
    <button className="probe" data-bumps={bumps} onClick={() => setBumps((n) => n + 1)}>
      probe
    </button>
  );
}

const probe = () => document.body.querySelector<HTMLElement>('.probe');

describe('React overlay keep-alive (#465)', () => {
  it('O1/O7: a modal keeps its content across close and reopen, and removes it on unmount', async () => {
    mounts = 0;
    const view = (open: boolean, shown = true) => (shown ? <BsModal open={open}><Probe /></BsModal> : <></>);
    await render(view(true));
    await flush();
    const first = probe();
    expect(first).not.toBeNull();
    await act(async () => first!.click());
    await render(view(false));
    await flush();
    expect(probe()).toBe(first);
    expect(first!.closest('.modal')?.hasAttribute('hidden')).toBe(true);
    await render(view(true));
    await flush();
    expect(probe()).toBe(first);
    expect(probe()!.getAttribute('data-bumps')).toBe('1');
    expect(mounts).toBe(1);
    await render(view(false, false));
    expect(probe()).toBeNull();
    expect(document.body.querySelector('[data-mp-overlay]')).toBeNull();
  });

  it('O1/O7: a tooltip keeps its content across hide and show, and removes it with the trigger', async () => {
    mounts = 0;
    function Trigger() {
      const [anchor, overlay] = useBsTooltip({ content: <Probe /> });
      return (
        <>
          <button className="trigger" {...anchor}>trigger</button>
          {overlay}
        </>
      );
    }
    const host = await render(<Trigger />);
    const trigger = host.querySelector<HTMLElement>('.trigger')!;
    await act(async () => void trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));
    await flush();
    const first = probe();
    expect(first).not.toBeNull();
    await act(async () => void trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    await flush();
    expect(probe()).toBe(first);
    expect(first!.closest('.tooltip')?.hasAttribute('hidden')).toBe(true);
    await act(async () => void trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));
    await flush();
    expect(probe()).toBe(first);
    expect(mounts).toBe(1);
    await render(<></>);
    expect(probe()).toBeNull();
    expect(document.body.querySelector('[data-mp-overlay]')).toBeNull();
  });
});
