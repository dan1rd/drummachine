/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Application,
  Container,
  FillGradient,
  Graphics,
  Ticker,
  BlurFilter,
  ContainerChild,
  Assets,
  Sprite,
} from 'pixi.js';
import { useEffect, useRef } from 'react';
import { sound } from '@pixi/sound';
import { Slider } from '@pixi/ui';
import gsap from 'gsap';

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
  shake: {
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
    let bpm = 200;
    let currentStep = 0;
    let currentTimeMS = 0;
    const totalSteps = 8;
    let totalMS = (totalSteps / (bpm / 60)) * 1000;
    let fractionMS = totalMS / totalSteps;
    let msUntilNextBeat = fractionMS;

    const stepSizePx = 64;

    const sequencerData: Sequencer = {
      kick: { steps: [], volume: 0.5 },
      hat: { steps: [], volume: 0.5 },
      snare: { steps: [], volume: 0.5 },
      shake: { steps: [], volume: 0.5 },
    };

    let ticker: Ticker | null = null;
    async function main() {
      canvasContainerRef.current?.appendChild(app.canvas);

      ticker = new Ticker();
      ticker.add(tick);
      ticker.stop();

      /*
        Load Assets
      */

      const kickTexture = await Assets.load('src/assets/kick.webp');
      const hiHatTexture = await Assets.load('src/assets/hi-hat.webp');
      const snareTexture = await Assets.load('src/assets/snare.webp');
      const shakerTexture = await Assets.load('src/assets/shaker.webp');

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
        createStepsRow(8, 'shake'),
      ];
      stepsRows.forEach((container, i) => {
        container.y = (container.height + 16) * i;
        sequencerContainer.addChild(container);
      });

      const playheadSize = 24;
      const timelineContainer = new Container();
      timelineContainer.label = 'timeline-container';

      const timelineBar = new Graphics()
        .roundRect(0, 0, sequencerContainer.width - stepSizePx, 10)
        .fill(theme.stroke);
      timelineBar.label = 'timeline-bar';

      const playhead = new Graphics()
        .rect(0, -0, playheadSize, playheadSize)
        .fill(
          createGradient(
            [theme.gradientOne, theme.gradientTwo],
            { x: 0, y: 0 },
            { x: playheadSize, y: playheadSize }
          )
        );
      playhead.label = 'playhead';

      playhead.pivot.set(playhead.width / 2, playhead.height / 2);
      playhead.y = playhead.height / 4;
      playhead.rotation = Math.PI / 4;

      timelineContainer.x = stepSizePx / 2;

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
      controlsContainer.label = 'controls-container';

      const kickSampleIcon = Sprite.from(kickTexture);
      const hatSampleIcon = Sprite.from(hiHatTexture);
      const snareSampleIcon = Sprite.from(snareTexture);
      const shakerSampleIcon = Sprite.from(shakerTexture);

      [
        createVolumeSlider('kick', 0.0, 1.0, kickSampleIcon),
        createVolumeSlider('hat', 0.0, 1.0, hatSampleIcon),
        createVolumeSlider('snare', 0.0, 1.0, snareSampleIcon),
        createVolumeSlider('shake', 0.0, 1.0, shakerSampleIcon),
      ].forEach((slider, index) => {
        controlsContainer.addChild(slider);
        slider.y = (stepSizePx + 18) * index;
      });

      const playControlsContainer = new Container();

      const bpmSliderContainer = new Container();
      bpmSliderContainer.label = 'bpm-slider-container';

      const bpmSliderFill = new Graphics()
        .roundRect(0, 0, 125, 40, 2)
        .fill(theme.stroke)
        .stroke(theme.bodyBG);

      const bpmSliderBg = new Graphics()
        .roundRect(0, 0, 125, 40, 2)
        .fill(theme.bodyBG)
        .stroke(theme.stroke);

      const bpmSlider = new Graphics();
      const bpmSliderControl = new Slider({
        fill: bpmSliderFill,
        bg: bpmSliderBg,
        value: 180,
        min: 60,
        max: 500,
        slider: bpmSlider,
      });

      bpmSliderControl.onUpdate.connect((value) => {
        bpm = value;
        console.log(bpm);
      });

      bpmSliderContainer.addChild(bpmSliderControl);
      bpmSliderContainer.y = app.screen.height - 40 - bpmSliderContainer.height;

      playControlsContainer.addChild(bpmSliderContainer);

      controlsContainer.addChild(playControlsContainer);

      controlsContainer.y = stepSizePx / 2;
      controlsContainer.x = 24;

      app.stage.addChild(controlsContainer);

      const button = new Graphics().rect(0, app.screen.height - 20, 20, 20).fill(theme.stroke);
      app.stage.addChild(button);
      button.interactive = true;
      button.cursor = 'pointer';
      button.on('pointerdown', () => {
        togglePlayback();
      });

      function togglePlayback() {
        if (!ticker?.started) {
          ticker?.start();
        } else {
          ticker?.stop();
        }
      }

      function tick(delta: Ticker) {
        totalMS = (totalSteps / (bpm / 60)) * 1000;
        fractionMS = totalMS / totalSteps;
        msUntilNextBeat -= delta.deltaMS;
        currentTimeMS += delta.deltaMS;

        if (msUntilNextBeat <= 0) {
          msUntilNextBeat = fractionMS;

          if (currentStep === totalSteps - 1) {
            currentStep = 0;
            currentTimeMS = 0;
            gsap.to(playhead, {
              x: 0,
              duration: 0.1,
            });
          } else {
            currentStep++;
            gsap.to(playhead, {
              x: playhead.x + stepSizePx + 16,
              duration: 0.2,
            });
          }

          for (const key in sequencerData) {
            const sample = key as keyof Sequencer;
            if (sequencerData[sample].steps[currentStep].isToggled) {
              sound.play(sample, { volume: sequencerData[sample].volume });
            }
          }
        }
      }
    }

    function createVolumeSlider(sample: SequencerKey, min: number, max: number, icon: Sprite) {
      const sliderContainer = new Container();
      sliderContainer.label = 'volume-slider-container';

      const sliderFill = new Graphics()
        .roundRect(0, 0, 150, 16, 2)
        .fill(
          createGradient([theme.gradientOne, theme.gradientTwo], { x: 0, y: 0 }, { x: 150, y: 0 })
        );

      const sliderBg = new Graphics().roundRect(0, 0, 150, 16, 2).fill(theme.stroke);
      const slider = new Graphics();
      const sliderControl = new Slider({
        fill: sliderFill,
        bg: sliderBg,
        value: max / 2,
        min,
        max,
        slider,
      });

      icon.scale = 0.4;
      sliderControl.y = icon.height / 2 - sliderControl.height / 2;

      icon.alpha = 1;
      sliderControl.onUpdate.connect((value) => {
        sequencerData[sample].volume = value;
        icon.alpha = Math.max(Math.min(value + 0.5, 1), 0.2);
      });

      sliderBg.cursor = 'pointer';
      sliderFill.cursor = 'pointer';

      sliderContainer.addChild(sliderControl);

      sliderContainer.addChild(icon);
      icon.anchor = 0.5;
      icon.y = icon.height / 2;
      icon.x = icon.width / 2 + sliderControl.width + 20;

      return sliderContainer;
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
        const singleStepContainer = createStep(stepSizePx, theme.stepBG, [theme.dark]);
        singleStepContainer.position.x = (stepSizePx + 16) * i;
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
            stepSizePx,
            theme.stroke,
            [theme.gradientOne, theme.gradientTwo],
            true
          );
        } else {
          newStep = createStep(stepSizePx, theme.stepBG, [theme.dark]);
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
