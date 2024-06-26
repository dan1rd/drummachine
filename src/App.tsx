import './App.css';
import BeatMaker from './BeatMaker/BeatMaker';
import { sound } from '@pixi/sound';

sound.add('kick', 'src/samples/kick.wav');
sound.add('hat', 'src/samples/hat.wav');
sound.add('snare', 'src/samples/snare.wav');
sound.add('shake', 'src/samples/shake.wav');

const App = () => {
  return (
    <>
      <BeatMaker />
    </>
  );
};

export default App;
