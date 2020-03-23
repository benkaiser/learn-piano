const TRIMMED_COUNT = 50;

class App extends React.Component {
  constructor() {
    super();
    navigator.requestMIDIAccess()
    .then((access) => {

      // Get lists of available MIDI controllers
      const inputs = access.inputs.values();
      const outputs = access.outputs.values();
      for (var input of inputs) {
        input.onmidimessage = this.onMidiMessage;
      }

      access.onstatechange = function(e) {
        // Print information about the (dis)connected MIDI controller
        console.log(e.port.name, e.port.manufacturer, e.port.state);
      };
    });
    MIDI.Player.removeListener(); // removes current listener.
    MIDI.Player.addListener(this._onMidiNotePlayed);
    this.state = { bpm: 80 };
    loadSong(80);
  }

  onMidiMessage = (midiMessage) => {
    console.log(midiMessage.data);
    if (midiMessage.data[0] === 144) {
      MIDI.noteOn(0, midiMessage.data[1], midiMessage.data[2], 0);
      if (midiMessage.data[1] === MIDI.keyToNote[this.state.noteToPlay]) {
        this._play();
      }
    } else if (midiMessage.data[0] === 128) {
      MIDI.noteOff(0, midiMessage.data[1], 0);
    } else if (midiMessage.data[0] === 176 && midiMessage.data[1] === 41) {
      this.setState({ bpm: midiMessage.data[2]});
    }
  }

  _onMidiNotePlayed = (data) => {
    var now = data.now; // where we are now
    var end = data.end; // time when song ends
    var channel = data.channel; // channel note is playing on
    var message = data.message; // 128 is noteOff, 144 is noteOn
    var note = data.note; // the note
    var velocity = data.velocity; // the velocity of the note
    // then do whatever you want with the information!
    console.log({
      channel,
      message,
      note,
      velocity
    });
    this.setState({
      noteToPlay: MIDI.noteToKey[note]
    });
    if (message === 144) {
      this._pause();
    }
  }

  render(){
    return (
      <div>
        <h1>
          Learn Piano
        </h1>
        <p>Current BPM: { this.state.bpm}</p>
        <p>Current Note to Play: { this.state.noteToPlay }</p>
        <button>Dead button to enable keyboard</button>
        <button onClick={this._play}>Play</button>
        <button onClick={this._pause}>Pause</button>
        <button onClick={this._restart}>Restart</button>
      </div>
    );
  }

  _play = () => {
    MIDI.Player.start();
  }

  _pause = () => {
    MIDI.Player.pause();
  }

  _restart = () => {
    loadSong(this.state.bpm);
  }
}

MIDI.loadPlugin({ instrument: 'acoustic_grand_piano' });

ReactDOM.render(
  <App />,
  document.getElementById('container')
);
