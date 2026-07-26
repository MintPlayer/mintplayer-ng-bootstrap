import { useState } from 'react';
import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';
import type { CarouselAnimation, CarouselOrientation, CarouselSlideChangeEventDetail, CarouselPausedChangeEventDetail } from '@mintplayer/react-bootstrap/carousel';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import './CarouselPage.css';

const BASIC_SOURCE = `<BsCarousel indicators interval={4000} ariaLabel="Animal photos"
  onSlideChange={(e) => setIndex(e.detail.index)}>
  <img src="/assets/resized/deer.png" alt="A deer" />
  <img src="/assets/resized/duck.png" alt="A duck" />
  <img src="/assets/resized/lion.png" alt="A lion" />
</BsCarousel>`;

const IMAGES = [
  { src: '/assets/resized/deer.png', alt: 'A deer' },
  { src: '/assets/resized/duck.png', alt: 'A duck' },
  { src: '/assets/resized/leopard.png', alt: 'A leopard' },
  { src: '/assets/resized/lion.png', alt: 'A lion' },
  { src: '/assets/resized/peacock.png', alt: 'A peacock' },
  { src: '/assets/resized/tiger.png', alt: 'A tiger' },
] as const;

export function CarouselPage() {
  const [animation, setAnimation] = useState<CarouselAnimation>('slide');
  const [orientation, setOrientation] = useState<CarouselOrientation>('horizontal');
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <div className="demo-page">
      <h1>Carousel</h1>
      <p>
        <code>BsCarousel</code> wraps the framework-agnostic <code>&lt;mp-carousel&gt;</code> web
        component: slides are plain children, with indicators, auto-advance, slide/fade animation
        in both orientations, touch swipe, keyboard support and a radio-driven no-JS tier.
      </p>

      <section data-demo="basic">
        <h2>Basic</h2>
        <BsCarousel
          animation={animation}
          orientation={orientation}
          indicators
          interval={4000}
          paused={paused}
          ariaLabel="Animal photos"
          onSlideChange={(e: CustomEvent<CarouselSlideChangeEventDetail>) => setIndex(e.detail.index)}
          onPausedChange={(e: CustomEvent<CarouselPausedChangeEventDetail>) => setPaused(e.detail.paused)}
        >
          {IMAGES.map((img) => (
            <img key={img.src} src={img.src} alt={img.alt} />
          ))}
        </BsCarousel>
        <div className="mt-2 d-flex gap-2 align-items-center justify-content-center">
          <label>
            Mode{' '}
            <select className="form-select d-inline-block w-auto" value={animation}
              onChange={(e) => setAnimation(e.target.value as CarouselAnimation)}>
              <option value="slide">Slide</option>
              <option value="fade">Fade</option>
            </select>
          </label>
          <label>
            Orientation{' '}
            <select className="form-select d-inline-block w-auto" value={orientation}
              onChange={(e) => setOrientation(e.target.value as CarouselOrientation)}>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </label>
          <span className="text-body-secondary">
            Slide: <code>{index + 1}</code> {paused ? '(paused)' : ''}
          </span>
        </div>
        <BsCodeSnippet code={BASIC_SOURCE} language="tsx" />
      </section>

      <section data-demo="nojs">
        <h2>Without JavaScript (server-rendered)</h2>
        <p className="text-body-secondary">
          Two independent carousels: with JS disabled each keeps its own radio-driven state.
        </p>
        <div className="nojs-pair">
          <BsCarousel animation="fade" indicators ariaLabel="Fade pair">
            {IMAGES.slice(0, 3).map((img) => (
              <img key={img.src} src={img.src} alt={img.alt} />
            ))}
          </BsCarousel>
          <BsCarousel animation="slide" indicators ariaLabel="Slide pair">
            {IMAGES.slice(3).map((img) => (
              <img key={img.src} src={img.src} alt={img.alt} />
            ))}
          </BsCarousel>
        </div>
      </section>
    </div>
  );
}
