import { useState } from 'react';
import { BsCarousel, type CarouselAnimation } from '@mintplayer/react-bootstrap/carousel';
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
  const [vertical, setVertical] = useState(false);
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
            <select
              className="form-select form-select-sm d-inline-block w-auto"
              value={animation}
              onChange={(e) => setAnimation(e.target.value as CarouselAnimation)}
            >
              <option value="slide">slide</option>
              <option value="fade">fade</option>
              <option value="none">none</option>
            </select>
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
            <input type="checkbox" checked={vertical} onChange={(e) => setVertical(e.target.checked)} />{' '}
            Vertical
          </label>
          <label>
            <input type="checkbox" checked={indicators} onChange={(e) => setIndicators(e.target.checked)} />{' '}
            Indicators
          </label>
          <span className="badge text-bg-secondary">index: {index}</span>
          <span className="badge text-bg-secondary">{paused ? 'paused' : 'playing'}</span>
        </div>

        <BsCarousel
          style={{ display: 'block', maxWidth: '500px', margin: '0 auto' }}
          animation={animation}
          orientation={vertical ? 'vertical' : 'horizontal'}
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
        <h2>Usage</h2>
        <BsCodeSnippet language="tsx" code={SOURCE} />
      </section>
    </div>
  );
}

export default CarouselPage;
