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
    const playSpeedFromLocalStorage = localStorage.getItem('playspeed');
    let playspeed = 64;
    if (playSpeedFromLocalStorage && parseInt(playSpeedFromLocalStorage, 10)) {
      playspeed = parseInt(playSpeedFromLocalStorage, 10);
      MIDIPlayer.changePlaySpeed(playspeed / 64);
    }
    MIDIPlayer.onNotePlayed = this.onSongNotePlayed.bind(this);
    this.state = { playspeed, notesBeingPlayed: [] };
  }

  onMidiMessage = (midiMessage) => {
    console.log(midiMessage.data);
    if (midiMessage.data[0] === 144) {
      MIDI.noteOn(0, midiMessage.data[1], midiMessage.data[2], 0);
      this.setState({
        notesBeingPlayed: this.state.notesBeingPlayed.concat(midiMessage.data[1])
      });
      if (midiMessage.data[1] === MIDI.keyToNote[this.state.noteToPlay]) {
        this._play();
      }
    } else if (midiMessage.data[0] === 128) {
      MIDI.noteOff(0, midiMessage.data[1], 0);
      this.setState({
        notesBeingPlayed: this.state.notesBeingPlayed.filter(note => note !== midiMessage.data[1])
      });
    } else if (midiMessage.data[0] === 176 && midiMessage.data[1] === 41) {
      this.setState({ playspeed: midiMessage.data[2]});
      localStorage.setItem('playspeed', midiMessage.data[2]);
      MIDIPlayer.changePlaySpeed(midiMessage.data[2] / 64)
    }
  }

  onSongNotePlayed(note) {
    if (note.subtype === 'noteOff' || note.velocity === 0) {
      this.setState({
        notesBeingPlayed: this.state.notesBeingPlayed.filter(noteBeingPlayed => noteBeingPlayed !== note.note)
      });
    } else {
      this.setState({
        notesBeingPlayed: this.state.notesBeingPlayed.concat(note.note)
      });
    }
    console.log(note);
  }

  render(){
    return (
      <div>
        <h1>
          Learn Piano
        </h1>
        <p>Current Play Speed: { (this.state.playspeed / 64 * 100).toFixed(0) }%</p>
        <p>
          <button>Dead button to enable keyboard</button>
          <button onClick={this._play}>Play</button>
          <button onClick={this._pause}>Pause</button>
          <button onClick={this._resume}>Resume</button>
        </p>
        <div>
          <NoteVisualizer notesBeingPlayed={ this.state.notesBeingPlayed } />
        </div>
      </div>
    );
  }

  _play = () => {
    MIDIPlayer.restart();
  }

  _pause = () => {
    MIDIPlayer.pause();
  }

  _resume = () => {
    MIDIPlayer.resume();
  }
}

class NoteVisualizer extends React.Component {
  constructor() {
    super();
    this._notesRef = React.createRef();
    this._pianoRef = React.createRef();
    this._render = this._render.bind(this);
  }

  componentWillReceiveProps() {
    requestAnimationFrame(this._render);
  }

  render() {
    return (
      <React.Fragment>
        <canvas ref={this._notesRef} height={ (window.innerHeight - 300) + 'px' } width="988px" />
        <canvas ref={this._pianoRef} height="72px" width="988px" />
      </React.Fragment>
    );
  }

  componentDidMount() {
    this._notesContext = this._notesRef.current.getContext('2d');
    this._pianoContext = this._pianoRef.current.getContext('2d');
    requestAnimationFrame(this._render);
  }

  _render() {
    this._notesContext.fillRect(10, 10, 10, 10);
    this._pianoContext.fillRect(10, 10, 10, 10);
    this._drawPiano(this._pianoContext, this._pianoRef.current.height, this._pianoRef.current.width, this.props.notesBeingPlayed);
  }

  _drawPiano(context, canvasHeight, canvasWidth, RedKeyArray) {
    RedKeyArray = RedKeyArray.map(key => key - 21);

    // general characteristics of a piano

    var TOTAL_KEYS = 88;
    var NUM_WHITE_KEYS = 52;
    var NUM_BLACK_KEYS = TOTAL_KEYS - NUM_WHITE_KEYS;

    var ctx = context;

    var X_BORDER = 0;
    var Y_BORDER = 0;

    var width = canvasWidth - (X_BORDER * 2);
    var height = canvasHeight - (Y_BORDER * 2);

    var WHITE_KEY_WIDTH = (width / NUM_WHITE_KEYS);
    var WHITE_KEY_HEIGHT = height;

    var BLACK_KEY_WIDTH = WHITE_KEY_WIDTH * .75
    var BLACK_KEY_HEIGHT = height * .66

    function DrawRectWithBorder(X, Y, Width, Height, Color1, Color2) {

      //draw border
      ctx.fillStyle = Color1;
      ctx.fillRect(X, Y, Width, Height);

      //draw inside
      ctx.fillStyle = Color2;
      ctx.fillRect(X + 1, Y + 1, Width - 2, Height - 2);

    }

    // draws a back key, based on whiteKeyIndex, where 0 <= WhiteKeyIndex < 52
    function drawBlackKey(whiteKeyIndex, shouldBeRed = false) {

      if (!shouldBeRed) {

        const C1 = "rgb(0,0,0)";			// black
        const C2 = "rgb(50,50,50)";		// ??

        DrawRectWithBorder(X_BORDER + ((whiteKeyIndex + 1) * WHITE_KEY_WIDTH) - (BLACK_KEY_WIDTH / 2), Y_BORDER, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT, C1, C2);

      }
      else {

        const C1 = "rgb(0,0,0)";			// black
        const C2 = "rgb(255,0,0)";		// red

        DrawRectWithBorder(X_BORDER + ((whiteKeyIndex + 1) * WHITE_KEY_WIDTH) - (BLACK_KEY_WIDTH / 2), Y_BORDER, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT, C1, C2);

      }

    }

    function DrawWhiteKey(WhiteKeyIndex, shouldBeRed = false) {

      if (!shouldBeRed) {

        const C1 = "rgb(0,0,0)";			// black
        const C2 = "rgb(255,255,255)";	// white

        DrawRectWithBorder(X_BORDER + (WhiteKeyIndex * WHITE_KEY_WIDTH), Y_BORDER, WHITE_KEY_WIDTH, height, C1, C2);

      } else {

        const C1 = "rgb(0,0,0)";			// black
        const C2 = "rgb(255,0,0)";		// red

        DrawRectWithBorder(X_BORDER + (WhiteKeyIndex * WHITE_KEY_WIDTH), Y_BORDER, WHITE_KEY_WIDTH, height, C1, C2);

      }
    }

    function keyType(isBlack, White_Index) {
      this.isBlack = isBlack;
      this.White_Index = White_Index
    }

    function AbsoluteToKeyInfo(AbsoluteNoteNum) {

      var KeyLookupTable = new Array(TOTAL_KEYS);

      KeyLookupTable[0] = new keyType(false, 0);			// a
      KeyLookupTable[1] = new keyType(true, 0);			// a#
      KeyLookupTable[2] = new keyType(false, 1);			// b
      let base = 3;

      const NumOctaves = 8
      for (let counter = 0; counter < NumOctaves; counter++) {
        let octave_offset = 7 * counter;

        KeyLookupTable[base + 0] = new keyType(false, octave_offset + 2); // c
        KeyLookupTable[base + 1] = new keyType(true, octave_offset + 2); // c#
        KeyLookupTable[base + 2] = new keyType(false, octave_offset + 3); // d
        KeyLookupTable[base + 3] = new keyType(true, octave_offset + 3); // d#
        KeyLookupTable[base + 4] = new keyType(false, octave_offset + 4); // e
        KeyLookupTable[base + 5] = new keyType(false, octave_offset + 5); // f
        KeyLookupTable[base + 6] = new keyType(true, octave_offset + 5); // f#
        KeyLookupTable[base + 7] = new keyType(false, octave_offset + 6); // g
        KeyLookupTable[base + 8] = new keyType(true, octave_offset + 6); // g#
        KeyLookupTable[base + 9] = new keyType(false, octave_offset + 7); // a
        KeyLookupTable[base + 10] = new keyType(true, octave_offset + 7)  // a#
        KeyLookupTable[base + 11] = new keyType(false, octave_offset + 8); // b

        base += 12;
      }

      return KeyLookupTable[AbsoluteNoteNum];
    }



    // just draw in all the white keys to begin with...
    for (let i = 0; i < NUM_WHITE_KEYS; i++) {
      DrawWhiteKey(i, false);
    }


    // now draw specially white keys that need to be red...
    // just loop through all the RedKeyArray
    for (let index = 0; index <= TOTAL_KEYS; index++) {
      // and if we find any white keys that are supposed to be red, then draw them in red...
      if (RedKeyArray.includes(index)) {
        let KeyLookup = AbsoluteToKeyInfo(index);
        if (!KeyLookup.isBlack)
          DrawWhiteKey(KeyLookup.White_Index, true);
      }
    }

    // draw in lowest a# manually (making sure to draw it red if it should be)
    const LowestShouldBeRed = RedKeyArray.includes(1);
    drawBlackKey(0, LowestShouldBeRed);

    // now draw all the rest of the black keys...
    // loop through all 7 octaves
    const numOctaves = 7;
    let curWhiteNoteIndex = 2;

    for (let octave = 0; octave < numOctaves; octave++) {
      // and draw 5 black notes per octave...
      for (let i = 0; i < 5; i++) {
        drawBlackKey(curWhiteNoteIndex, false);
        if (i == 1 || i == 4)
          curWhiteNoteIndex += 2;
        else
          curWhiteNoteIndex += 1;
      }
    }


    // now draw specially black keys that need to be red...
    // just loop through all the RedKeyArray
    for (let index = 0; index <= 88; index++) {
      // and if we find any black keys that are supposed to be red, then draw them in red...
      if (RedKeyArray.includes(index)) {
        let KeyLookup = AbsoluteToKeyInfo(index);
        if (KeyLookup.isBlack)
          drawBlackKey(KeyLookup.White_Index, true);
      }
    }
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('container')
);
