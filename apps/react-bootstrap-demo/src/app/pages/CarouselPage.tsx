import { useState } from 'react';
import {
  BsCarousel,
  type CarouselAnimation,
  type CarouselOrientation,
} from '@mintplayer/react-bootstrap/carousel';
import { BsCheckbox } from '@mintplayer/react-bootstrap/checkbox';
import { BsSelect } from '@mintplayer/react-bootstrap/select';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SLIDES = ['deer', 'duck', 'leopard', 'lion', 'peacock', 'tiger'];

const SOURCE = `import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';

export function MyCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  return (
    <BsCarousel
      indicators
      interval={4000}
      paused={paused}
      ariaLabel="Example carousel"
      onSlideChange={(e) => setIndex(e.detail.index)}
      onPausedChange={(e) => setPaused(e.detail.paused)}
    >
      <img src="/a.jpg" alt="" />
      <img src="/b.jpg" alt="" />
      <img src="/c.jpg" alt="" />
    </BsCarousel>
  );
}`;

export function CarouselPage() {
  const [animation, setAnimation] = useState<CarouselAnimation>('slide');
  const [orientation, setOrientation] = useState<CarouselOrientation>('horizontal');
  const [indicators, setIndicators] = useState(true);
  const [interval, setIntervalMs] = useState(4000);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <div className="demo-page">
      <h1>Carousel</h1>
      <p className="text-body-secondary">
        Slide / fade / none transitions, horizontal &amp; vertical orientation, optional
        auto-advance with a pause control, indicators, swipe and keyboard. Renders
        identically across Angular / React / Vue from the same <code>&lt;mp-carousel&gt;</code>
        web component.
      </p>

      <section>
        <h2>Interactive</h2>
        <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
          <label>
            Animation{' '}
            <BsSelect
              value={animation}
              onValueChange={(e) => setAnimation(e.detail.value as CarouselAnimation)}
            >
              <option value="slide">slide</option>
              <option value="fade">fade</option>
              <option value="none">none</option>
            </BsSelect>
          </label>
          <label>
            Interval (ms){' '}
            <input
              type="number"
              className="form-control form-control-sm d-inline-block w-auto"
              value={interval}
              step={500}
              min={0}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
            />
          </label>
          <label>
            Orientation{' '}
            <BsSelect
              value={orientation}
              onValueChange={(e) => setOrientation(e.detail.value as CarouselOrientation)}
            >
              <option value="horizontal">horizontal</option>
              <option value="vertical">vertical</option>
            </BsSelect>
          </label>
          <BsCheckbox checked={indicators} onChange={(e) => setIndicators(e.detail.checked)}>
            Indicators
          </BsCheckbox>
          <span className="badge text-bg-secondary">index: {index}</span>
          <span className="badge text-bg-secondary">{paused ? 'paused' : 'playing'}</span>
        </div>

        <BsCarousel
          style={{ display: 'block', maxWidth: '500px', margin: '0 auto' }}
          animation={animation}
          orientation={orientation}
          indicators={indicators}
          interval={interval}
          paused={paused}
          ariaLabel="Example carousel"
          onSlideChange={(e) => setIndex(e.detail.index)}
          onPausedChange={(e) => setPaused(e.detail.paused)}
        >
          {SLIDES.map((name) => (
            <img key={name} src={`/assets/resized/${name}.png`} alt={name} />
          ))}
        </BsCarousel>
      </section>

      <section>
        <h2>Without JavaScript (server-rendered)</h2>
        <p className="text-body-secondary">
          These are the same, fully-interactive carousels as above — they're here to show they
          keep working with JavaScript <em>off</em>, served as ready-rendered HTML:{' '}
          <code>slide</code> degrades to a native scroll-snap strip, <code>fade</code> to a
          pure-CSS radio + dot machine (click a dot). To try it, open your browser's DevTools and
          toggle <em>Disable JavaScript</em> (<kbd>Ctrl/Cmd+Shift+P</kbd> → “Disable JavaScript”),
          then reload — browsers don't allow a page to link to that setting directly.
        </p>
        <div className="d-flex flex-wrap gap-4">
          <div>
            <h3 className="h6">Fade</h3>
            <BsCarousel animation="fade" indicators ariaLabel="Fade carousel" style={{ display: 'block', maxWidth: '320px' }}>
              {SLIDES.map((name) => (
                <img key={name} src={`/assets/resized/${name}.png`} alt={name} />
              ))}
            </BsCarousel>
          </div>
          <div>
            <h3 className="h6">Slide (scroll-snap)</h3>
            <BsCarousel animation="slide" ariaLabel="Slide carousel" style={{ display: 'block', maxWidth: '320px' }}>
              {SLIDES.map((name) => (
                <img key={name} src={`/assets/resized/${name}.png`} alt={name} />
              ))}
            </BsCarousel>
          </div>
        </div>
      </section>

      <section>
        <h2>Usage</h2>
        <BsCodeSnippet language="tsx" code={SOURCE} />
      </section>
    </div>
  );
}

export default CarouselPage;
