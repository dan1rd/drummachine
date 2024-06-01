import { Application, Container } from 'pixi.js';
import { useEffect, useRef } from 'react';

const BeatMaker = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new Application();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__PIXI_APP__ = app;

    const currentCanvasContainer = canvasContainerRef.current;

    async function main() {
      currentCanvasContainer?.appendChild(app.canvas);

      const container = new Container({ x: app.screen.width / 2, y: app.screen.height / 2 });
      app.stage.addChild(container);
    }

    app.init({ background: '#050308', width: 900, height: 442 }).then(() => main());
    return () => {
      app?.stop();
      app?.destroy(true, true);
    };
  }, []);

  return <div className="beatmaker" ref={canvasContainerRef} />;
};

export default BeatMaker;
