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
  sample: Sample;
  isToggled: boolean;
}

type Sample = 'kick' | 'hat' | 'snare' | 'cymbal';
type StepRow = Step[];
type Sequencer = StepRow[];

const BeatMaker = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app;

    let bpm = 380;

    const sequencerData: Sequencer = [];
    const totalBeats = 8;
    const totalMS = (totalBeats / (bpm / 60)) * 1000;
    const fractionMS = totalMS / totalBeats;

    let isPlaying = false;
    let currentStep = 0;
    let msUntilNextBeat = fractionMS;

    function main() {
      canvasContainerRef.current?.appendChild(app.canvas);
      togglePlayback();

      const sequencer = createSequencer([
        createStepsRow(8, 'kick'),
        createStepsRow(8, 'hat'),
        createStepsRow(8, 'snare'),
        createStepsRow(8, 'cymbal'),
      ]);

      app.stage.addChild(sequencer);
    }

    function createSequencer(stepsContainer: Container[]) {
      const sequencerContainer = new Container();

      stepsContainer.forEach((container, i) => {
        container.y = (container.height + 16) * i;
        sequencerContainer.addChild(container);
      });

      return sequencerContainer;
    }

    function createStep(
      size: number,
      backgroundColor: string,
      indicatorGradientColors: string[],
      isIndicatorGlowing: boolean = false
    ) {
      const stepContainer = new Container();

      const stepGraphic = new Graphics()
        .roundRect(0, 0, size, size, 8)
        .fill({ color: backgroundColor });
      const indicatorSize = { width: size / 2, height: 6 };
      const indicatorGradient = createGradient(
        indicatorGradientColors,
        { x: indicatorSize.width / 2, y: 0 },
        { x: indicatorSize.width / 2 + indicatorSize.width, y: indicatorSize.height }
      );
      const toggleIndicator = new Graphics()
        .roundRect(indicatorSize.width / 2, 10, size / 2, indicatorSize.height)
        .fill(indicatorGradient);

      stepContainer.addChild(stepGraphic);

      if (isIndicatorGlowing) {
        const toggleIndicatorGlow = new Graphics()
          .roundRect(indicatorSize.width / 2, 10, size / 2, indicatorSize.height)
          .fill(indicatorGradient);

        const indicatorGlowFilter = new BlurFilter();
        indicatorGlowFilter.blur = 10;
        toggleIndicatorGlow.filters = [indicatorGlowFilter];
        stepContainer.addChild(toggleIndicatorGlow);
      }

      stepContainer.addChild(toggleIndicator);

      return stepContainer;
    }

    function createStepsRow(stepsCount: number, sample: Sample) {
      const stepsContainer = new Container();
      const stepsData: StepRow = [];
      const size = 64;

      for (let i = 0; i < stepsCount; i++) {
        const singleStepContainer = createStep(size, '#130E19', ['#050308']);
        singleStepContainer.position.x = (size + 16) * i;
        singleStepContainer.interactive = true;
        singleStepContainer.cursor = 'pointer';

        stepsContainer.addChild(singleStepContainer);
        stepsData.push({ sample, index: i, isToggled: false, uid: singleStepContainer.uid });
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
          newStep = createStep(size, '#22182D', ['#DCDCDC', '#B3B3B3'], true);
        } else {
          newStep = createStep(size, '#130E19', ['#050308']);
        }

        if (currentStepDataIndex !== -1) {
          stepsData[currentStepDataIndex] = {
            ...oldStepData,
            uid: newStep.uid,
            isToggled: newToggleState,
          };
        }

        console.log(stepsData);
        newStep.interactive = true;
        newStep.cursor = 'pointer';
        newStep.position.x = posX;
        stepsContainer.addChild(newStep);
      });

      sequencerData.push(stepsData);
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

    function tick(delta: Ticker) {
      msUntilNextBeat -= delta.deltaMS;
      if (msUntilNextBeat <= 0) {
        msUntilNextBeat = fractionMS;

        if (currentStep === totalBeats - 1) {
          currentStep = 0;
        } else {
          currentStep++;
        }

        sequencerData.forEach((sampleData) => {
          if (sampleData[currentStep].isToggled) {
            sound.play(sampleData[currentStep].sample);
          }
        });
      }
    }

    function togglePlayback() {
      bpm = 300; // todo

      isPlaying = !isPlaying;
      if (isPlaying) {
        app.ticker?.add(tick);
      } else {
        app.ticker?.remove(tick);
      }
    }

    function stopPlayback() {
      isPlaying = false;
      app.ticker?.remove(tick);
    }

    window.addEventListener('focus', stopPlayback);
    app.init({ background: '#050308', width: 900, height: 442 }).then(() => main());
    return () => {
      window.removeEventListener('focus', stopPlayback);
      app?.stop();
      app?.destroy(true, true);
    };
  }, []);

  return <div className="beatmaker" ref={canvasContainerRef} />;
};

export default BeatMaker;
