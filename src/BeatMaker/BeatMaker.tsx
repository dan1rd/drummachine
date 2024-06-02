/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Application,
  Container,
  FillGradient,
  Graphics,
  Ticker,
  BlurFilter,
  ContainerChild,
} from 'pixi.js';
import { useEffect, useRef } from 'react';
import { sound } from '@pixi/sound';

interface Step {
  uid: number;
  index: number;
  isToggled: boolean;
}

type StepRow = Step[];

interface Sequencer {
  kick: {
    steps: StepRow;
    volume: number;
  };
  hat: {
    steps: StepRow;
    volume: number;
  };
  snare: {
    steps: StepRow;
    volume: number;
  };
  cymbal: {
    steps: StepRow;
    volume: number;
  };
}

const theme = {
  bodyBG: '#07040C',
  stepBG: '#130E19',
  dark: '#050308',
  gradientOne: '#C68BEB',
  gradientTwo: '#D358F1',
  stroke: '#22182D',
};

type SequencerKey = keyof Sequencer;

const BeatMaker = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app;

    const sequencerData: Sequencer = {
      kick: { steps: [], volume: 0.5 },
      hat: { steps: [], volume: 0.5 },
      snare: { steps: [], volume: 0.5 },
      cymbal: { steps: [], volume: 0.5 },
    };

    /* Timing Options */
    let bpm = 200;
    const totalSteps = 8;
    const totalMS = (totalSteps / (bpm / 60)) * 1000;
    const fractionMS = totalMS / totalSteps;

    let currentStep = 0;
    let currentTimeMS = 0;
    let msUntilNextBeat = fractionMS;
    /* */

    /* Other Variables */
    const stepSize = 64;
    /* */

    let ticker: Ticker | null = null;
    function main() {
      canvasContainerRef.current?.appendChild(app.canvas);

      ticker = new Ticker();
      ticker.add(tick);
      ticker.stop();

      /*
       *-=-=-=-=-=-=-=-=-
       *   Sequencer
       *-=-=-=-=-=-=-=-=-
       */
      const sequencerContainer = new Container();
      sequencerContainer.label = 'sequencer-container';

      const stepsRows = [
        createStepsRow(8, 'kick'),
        createStepsRow(8, 'hat'),
        createStepsRow(8, 'snare'),
        createStepsRow(8, 'cymbal'),
      ];
      stepsRows.forEach((container, i) => {
        container.y = (container.height + 16) * i;
        sequencerContainer.addChild(container);
      });

      const playheadSize = 24;
      const timelineContainer = new Container();
      timelineContainer.label = 'timeline-container';

      const timelineBar = new Graphics()
        .roundRect(0, playheadSize / 2, sequencerContainer.width, 10)
        .fill(theme.stroke);
      timelineBar.label = 'timeline-bar';

      const playhead = new Graphics()
        .rect(playheadSize / 2, -(playheadSize / 2), playheadSize, playheadSize)
        .fill(
          createGradient(
            [theme.gradientOne, theme.gradientTwo],
            { x: 0, y: 0 },
            { x: playheadSize, y: playheadSize }
          )
        );
      playhead.label = 'playhead';
      playhead.rotation = Math.PI / 4;

      timelineContainer.addChild(timelineBar);
      timelineContainer.addChild(playhead);
      timelineContainer.y = sequencerContainer.height + 60;

      sequencerContainer.x = app.screen.width - sequencerContainer.width - 20;
      sequencerContainer.y = 16;
      sequencerContainer.addChild(timelineContainer);

      app.stage.addChild(sequencerContainer);

      /*
       *-=-=-=-=-=-=-=-=-
       *   Controls
       *-=-=-=-=-=-=-=-=-
       */

      const controlsContainer = new Container();

      // const button = new Graphics().rect(app.screen.width - 20, 0, 20, 20).fill(theme.stroke);
      // app.stage.addChild(button);
      // button.interactive = true;
      // button.cursor = 'pointer';
      // button.on('pointerdown', () => {
      //   togglePlayback();
      // });

      function togglePlayback() {
        if (!ticker?.started) {
          ticker?.start();
        } else {
          ticker?.stop();
        }
      }

      function tick(delta: Ticker) {
        msUntilNextBeat -= delta.deltaMS;
        currentTimeMS += delta.deltaMS;
        if (msUntilNextBeat <= 0) {
          msUntilNextBeat = fractionMS;

          if (currentStep === totalSteps - 1) {
            currentStep = 0;
            currentTimeMS = 0;
          } else {
            currentStep++;
          }

          for (const key in sequencerData) {
            const sample = key as keyof Sequencer;
            if (sequencerData[sample].steps[currentStep].isToggled) {
              sound.play(sample);
            }
          }
        }

        playhead.position.x = (currentTimeMS / totalMS) * (timelineBar.width - playheadSize);
      }
    }

    function createStep(
      size: number,
      backgroundColor: string,
      indicatorGradientColors: string[],
      isIndicatorGlowing: boolean = false
    ) {
      const stepContainer = new Container();
      stepContainer.label = 'step-container';

      const stepBackground = new Graphics()
        .roundRect(0, 0, size, size, 8)
        .fill({ color: backgroundColor });
      stepBackground.label = 'step-background';

      const indicatorSize = { width: size / 2, height: 6 };
      const indicatorGradient = createGradient(
        indicatorGradientColors,
        { x: indicatorSize.width / 2, y: 0 },
        { x: indicatorSize.width / 2 + indicatorSize.width, y: indicatorSize.height }
      );
      const toggleIndicator = new Graphics()
        .roundRect(indicatorSize.width / 2, 10, size / 2, indicatorSize.height)
        .fill(indicatorGradient);
      toggleIndicator.label = 'toggle-indicator';

      stepContainer.addChild(stepBackground);

      if (isIndicatorGlowing) {
        const toggleIndicatorGlow = new Graphics()
          .roundRect(indicatorSize.width / 2, 10, size / 2, indicatorSize.height)
          .fill(indicatorGradient);
        toggleIndicatorGlow.label = 'toggle-indicator-glow';

        const indicatorGlowFilter = new BlurFilter();
        indicatorGlowFilter.blur = 10;
        toggleIndicatorGlow.filters = [indicatorGlowFilter];
        stepContainer.addChild(toggleIndicatorGlow);
      }

      stepContainer.addChild(toggleIndicator);

      return stepContainer;
    }

    function createStepsRow(stepsCount: number, sample: SequencerKey) {
      const stepsContainer = new Container();
      stepsContainer.label = 'steps-container';

      const stepsData: StepRow = [];

      for (let i = 0; i < stepsCount; i++) {
        const singleStepContainer = createStep(stepSize, theme.stepBG, [theme.dark]);
        singleStepContainer.position.x = (stepSize + 16) * i;
        singleStepContainer.interactive = true;
        singleStepContainer.cursor = 'pointer';

        stepsContainer.addChild(singleStepContainer);
        stepsData.push({ index: i, isToggled: false, uid: singleStepContainer.uid });
      }

      stepsContainer.interactive = true;
      stepsContainer.on('pointerdown', (event) => {
        const currentStepDataIndex = stepsData.findIndex((step) => step.uid === event.target.uid);
        const oldStepData = stepsData[currentStepDataIndex];
        const newToggleState = !oldStepData.isToggled;

        const posX = event.target.position.x;
        stepsContainer.removeChild(event.target);

        let newStep: ContainerChild | null;
        if (newToggleState === true) {
          newStep = createStep(
            stepSize,
            theme.stroke,
            [theme.gradientOne, theme.gradientTwo],
            true
          );
        } else {
          newStep = createStep(stepSize, theme.stepBG, [theme.dark]);
        }

        if (currentStepDataIndex !== -1) {
          stepsData[currentStepDataIndex] = {
            ...oldStepData,
            uid: newStep.uid,
            isToggled: newToggleState,
          };
        }

        newStep.interactive = true;
        newStep.cursor = 'pointer';
        newStep.position.x = posX;
        stepsContainer.addChild(newStep);
      });

      sequencerData[sample].steps = stepsData;
      return stepsContainer;
    }

    function createGradient(
      colors: string[],
      startPos: { x: number; y: number },
      endPos: { x: number; y: number }
    ) {
      const gradientFill = new FillGradient(startPos.x, startPos.y, endPos.x, endPos.y);

      colors.forEach((number, index) => {
        const ratio = index / colors.length;
        gradientFill.addColorStop(ratio, number);
      });

      return gradientFill;
    }

    function stopTicker() {
      ticker?.stop();
    }

    window.addEventListener('focusout', stopTicker);
    window.addEventListener('visibilitychange', stopTicker);
    window.addEventListener('blur', stopTicker);
    app.init({ background: theme.bodyBG, width: 900, height: 442 }).then(() => main());
    return () => {
      window.removeEventListener('focusout', stopTicker);
      window.removeEventListener('visibilitychange', stopTicker);
      window.removeEventListener('blur', stopTicker);
      app?.stop();
      app?.destroy(true, true);
    };
  }, []);

  return <div className="beatmaker" ref={canvasContainerRef} />;
};

export default BeatMaker;
