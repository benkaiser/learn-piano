const TRIMMED_COUNT = 50;
const RERENDER_WAIT = 300;

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
    this.state = {
      playspeed,
      notesBeingPlayed: [],
      playType: 'both',
      lowNote: 21,
      highNote: 108,
      noteVisualizerKey: 0,
    };
    this._notesPlayed = [];
    this._waitingOnNotes = [];
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
          <input type='file' onChange={this._onMidiFileSelected} />
          <button onClick={this._changePlayType}>Playing { this.state.playType }</button>
          { this.state.playType !== 'both' &&
            <button disabled={this.state.nextNoteMarksSplit} onClick={this._markSplitWithNextNote}>Mark Split With Next Note: { MIDI.noteToKey[this.state.noteSplit] }</button>
          }
          <button disabled={this.state.markExtemeties} onClick={this._markExtemeties}>Mark Bottom and Top Notes: { this.state.lowNote && MIDI.noteToKey[this.state.lowNote] } { this.state.highNote && MIDI.noteToKey[this.state.highNote] }</button>
        </p>
        <div>
          <NoteVisualizer key={this.state.noteVisualizerKey} notesBeingPlayed={ this.state.notesBeingPlayed } />
        </div>
      </div>
    );
  }

  componentDidMount() {
    window.addEventListener('resize', () => {
      this._renderTimeout && clearTimeout(this._renderTimeout);
      this._renderTimeout = setTimeout(this._rerenderNotes, RERENDER_WAIT);
    });
  }

  _rerenderNotes = () => {
    this.setState({
      noteVisualizerKey: this.state.noteVisualizerKey + 1
    });
  }

  onMidiMessage = (midiMessage) => {
    if (midiMessage.data[0] === 144) {
      MIDI.noteOn(0, midiMessage.data[1], midiMessage.data[2], 0);
      this.setState({
        notesBeingPlayed: this.state.notesBeingPlayed.concat(midiMessage.data[1])
      });
      this._playNote(midiMessage.data[1]);
      if (this.state.nextNoteMarksSplit) {
        this.setState({
          nextNoteMarksSplit: false,
          noteSplit: midiMessage.data[1]
        });
      }
      if (this.state.markExtemeties) {
        if (!this.state.lowNoteMarked) {
          this.setState({
            lowNote: midiMessage.data[1],
            lowNoteMarked: true
          });
        } else {
          this.setState({
            highNote: midiMessage.data[1],
            markExtemeties: false
          });
        }
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

  _playNote(note) {
    const foundWaitingNote = this._waitingOnNotes.some(waitingNote => note === waitingNote.note);
    if (foundWaitingNote) {
      this._waitingOnNotes = this._waitingOnNotes.filter(waitingNote => note !== waitingNote.note);
      if (this._waitingOnNotes.length === 0) {
        MIDIPlayer.resume();
      }
    } else {
      this._notesPlayed.push({ note: note, time: performance.now() });
      this._notesPlayed = this._notesPlayed.filter(note => {
        return note.time > performance.now() - 1000;
      });
    }
  }

  _waitOnNote(waitingNote) {
    const foundNote = this._notesPlayed.some(note => waitingNote === note.note && note.time > performance.now() - 1000);
    if (foundNote) {
      this._notesPlayed = this._notesPlayed.filter(note => waitingNote !== note.note);
    } else {
      this._waitingOnNotes.push({ note: waitingNote });
      MIDIPlayer.pause();
    }
  }

  onSongNotePlayed(note) {
    if (note.subtype === 'noteOff' || note.velocity === 0) {
      this.setState({
        notesBeingPlayed: this.state.notesBeingPlayed.filter(noteBeingPlayed => noteBeingPlayed !== note.note)
      });
      if (this.state.playType === 'left' && note.note > this.state.noteSplit ||
        this.state.playType === 'right' && note.note < this.state.noteSplit) {
        MIDIPlayer.noteOff(0, note.note, note.velocity, 0);
      }
    } else {
      if ((this.state.playType === 'both' ||
        this.state.playType === 'left' && note.note <= this.state.noteSplit ||
        this.state.playType === 'right' && note.note >= this.state.noteSplit) && this._noteInKeyboard(note.note)) {

        this._waitOnNote(note.note);
      } else {
        MIDIPlayer.noteOn(0, note.note, note.velocity, 0);
      }
      this.setState({
        notesBeingPlayed: this.state.notesBeingPlayed.concat(note.note)
      });
    }
  }

  _noteInKeyboard = (note) => {
    return note >= this.state.lowNote && note <= this.state.highNote;
  }

  _play = () => {
    MIDIPlayer.restart();
    this.setState({
      notesBeingPlayed: []
    });
    this._waitingOnNotes = [];
  }

  _pause = () => {
    MIDIPlayer.pause();
  }

  _resume = () => {
    MIDIPlayer.resume();
  }

  _changePlayType = () => {
    if (this.state.playType == 'both') {
      this.setState({
        playType: 'right'
      });
    } else if (this.state.playType === 'right') {
      this.setState({
        playType: 'left'
      });
    } else if (this.state.playType == 'left') {
      this.setState({
        playType: 'none'
      });
    } else {
      this.setState({
        playType: 'both'
      });
    }
  }

  _onMidiFileSelected = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      MIDI.Player.loadFile(reader.result);
      this._notesPlayed = [];
      this._waitingOnNotes = [];
      MIDIPlayer.init();
      this._rerenderNotes();
    }, false);

    if (file) {
      reader.readAsDataURL(file);
    }
  }

  _markSplitWithNextNote = () => {
    this.setState({
      nextNoteMarksSplit: true
    });
  }

  _markExtemeties = () => {
    this.setState({
      markExtemeties: true,
      lowNoteMarked: false,
      lowNote: 21,
      highNote: 108
    });
  }
}

const PIANO_DRAW_OFFSET = 21;
const HEIGHT_PER_SECOND = 100;

class NoteVisualizer extends React.Component {
  constructor() {
    super();
    this._notesRef = React.createRef();
    this._pianoRef = React.createRef();
    this._canvasScrollerRef = React.createRef();
    this._render = this._render.bind(this);
    this._scrollNotes = this._scrollNotes.bind(this);
  }

  componentWillReceiveProps() {
    requestAnimationFrame(this._render);
  }

  render() {
    return (
      <React.Fragment>
        <div className='canvasScroller' ref={this._canvasScrollerRef} style={ ({ maxHeight: this._canvasDisplayHeight() + 'px', width: this._calculateWidth() })} >
          <canvas ref={this._notesRef} height={ this._noteCanvasHeight() + 'px' } width={this._calculateWidth()} />
        </div>
        <canvas ref={this._pianoRef} height={ this._keyboardHeight() } width={ this._calculateWidth() } className='pianoCanvas' />
      </React.Fragment>
    );
  }

  componentDidMount() {
    this._notesContext = this._notesRef.current.getContext('2d');
    this._pianoContext = this._pianoRef.current.getContext('2d');
    this._notesRef.current.style.marginTop = -1 * (this._noteCanvasHeight() - this._canvasDisplayHeight()) + 'px';
    this._redrawNoteCanvas();
    requestAnimationFrame(this._render);
    requestAnimationFrame(this._scrollNotes);
  }

  _render() {
    this._drawPiano(this._pianoContext, this._pianoRef.current.height, this._pianoRef.current.width, this.props.notesBeingPlayed);
  }

  _scrollNotes() {
    this._notesRef.current.style.marginTop = -1 * (this._noteCanvasHeight() - this._canvasDisplayHeight() - MIDIPlayer.currentTime() / 1000 * HEIGHT_PER_SECOND) + 'px';
    requestAnimationFrame(this._scrollNotes);
  }

  _calculateWidth() {
    return window.innerWidth - 20;
  }

  _keyboardHeight() {
    return Math.round(window.innerWidth / 16);
  }

  _noteCanvasHeight() {
    return (MIDIPlayer.totalPlayTime / 1000 * HEIGHT_PER_SECOND) + this._canvasDisplayHeight();
  }

  _canvasDisplayHeight() {
    return window.innerHeight - this._keyboardHeight() - 170;
  }

  _redrawNoteCanvas() {
    const ctx = this._notesContext;
    const width = this._notesRef.current.width;
    var TOTAL_KEYS = 88;
    var NUM_WHITE_KEYS = 52;
    var NUM_BLACK_KEYS = TOTAL_KEYS - NUM_WHITE_KEYS;
    var WHITE_KEY_WIDTH = (width / NUM_WHITE_KEYS);
    var BLACK_KEY_WIDTH = WHITE_KEY_WIDTH * .75
    const TOTAL_HEIGHT = this._noteCanvasHeight();

    // draw the background
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0, 0, width, TOTAL_HEIGHT);

    // draw lines between all white keys
    for (let index = 0; index < NUM_WHITE_KEYS; index++) {
      ctx.fillStyle = 'rgb(38, 38, 38)';
      ctx.fillRect(0 + (index * WHITE_KEY_WIDTH), 0, 1, TOTAL_HEIGHT);
    }

    // calculate note positions
    const noteUnits = MIDIPlayer.noteUnits();
    noteUnits.forEach(noteUnit => {
      const index = noteUnit.note - 21;
      const keyInfo = AbsoluteToKeyInfo(index);
      ctx.fillStyle = colorForNote(noteUnit.note);
      let xOffset = keyInfo.White_Index * WHITE_KEY_WIDTH;
      if (keyInfo.isBlack) {
        xOffset += WHITE_KEY_WIDTH - (BLACK_KEY_WIDTH / 2);
      }
      ctx.roundRect(xOffset, TOTAL_HEIGHT - (noteUnit.endTime / 1000 * HEIGHT_PER_SECOND), keyInfo.isBlack ? BLACK_KEY_WIDTH : WHITE_KEY_WIDTH, (noteUnit.endTime - noteUnit.startTime) / 1000 * HEIGHT_PER_SECOND, 3).fill();
    });
  }

  _drawPiano(context, canvasHeight, canvasWidth, SelectedKeyArray) {
    SelectedKeyArray = SelectedKeyArray.map(key => key - PIANO_DRAW_OFFSET);

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

    function DrawRectWithSideBorder(X, Y, Width, Height, Color1, Color2) {

      //draw border
      ctx.fillStyle = Color1;
      ctx.fillRect(X, Y, Width, Height);

      //draw inside
      ctx.fillStyle = Color2;
      ctx.fillRect(X + 1, Y, Width - 2, Height);

    }

    // draws a back key, based on WhiteKeyIndex, where 0 <= WhiteKeyIndex < 52
    function drawBlackKey(WhiteKeyIndex, shouldBeSelected = false, originalIndex) {
      if (!shouldBeSelected) {
        const C1 = "rgb(0,0,0)";
        const C2 = "rgb(50,50,50)";		// ??
        DrawRectWithBorder(X_BORDER + ((WhiteKeyIndex + 1) * WHITE_KEY_WIDTH) - (BLACK_KEY_WIDTH / 2), Y_BORDER, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT, C1, C2);
      }
      else {
        const C1 = "rgb(0,0,0)";
        const C2 = colorForNote(originalIndex + 21);
        DrawRectWithBorder(X_BORDER + ((WhiteKeyIndex + 1) * WHITE_KEY_WIDTH) - (BLACK_KEY_WIDTH / 2), Y_BORDER, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT, C2, C2);
      }
    }

    function DrawWhiteKey(WhiteKeyIndex, shouldBeSelected = false, originalIndex) {
      if (!shouldBeSelected) {
        const C1 = "rgb(0,0,0)";
        const C2 = "rgb(255,255,255)";
        DrawRectWithBorder(X_BORDER + (WhiteKeyIndex * WHITE_KEY_WIDTH), Y_BORDER, WHITE_KEY_WIDTH, height, C1, C2);
      } else {
        const C1 = "rgb(0,0,0)";
        const C2 = colorForNote(originalIndex + 21);
        DrawRectWithBorder(X_BORDER + (WhiteKeyIndex * WHITE_KEY_WIDTH), Y_BORDER, WHITE_KEY_WIDTH, height, C2, C2);
      }
    }

    function drawKeyColor(KeyLookup, originalIndex) {
      const WhiteKeyIndex = KeyLookup.White_Index;
      if (KeyLookup.isBlack) {
        const C1 = "rgb(50,50,50)";
        const C2 = colorForNote(originalIndex + 21);
        DrawRectWithSideBorder(X_BORDER + ((WhiteKeyIndex + 1) * WHITE_KEY_WIDTH) - (BLACK_KEY_WIDTH / 2), Y_BORDER, BLACK_KEY_WIDTH, 10, C1, C2);
      } else {
        const C1 = "rgb(50,50,50)";
        const C2 = colorForNote(originalIndex + 21);
        DrawRectWithSideBorder(X_BORDER + (WhiteKeyIndex * WHITE_KEY_WIDTH), Y_BORDER, WHITE_KEY_WIDTH, 10, C1, C2);
      }
    }



    // just draw in all the white keys to begin with...
    for (let i = 0; i < NUM_WHITE_KEYS; i++) {
      DrawWhiteKey(i, false);
    }


    // now draw specially white keys that need to be selected...
    // just loop through all the SelectedKeyArray
    for (let index = 0; index <= TOTAL_KEYS; index++) {
      let KeyLookup = AbsoluteToKeyInfo(index);
      // and if we find any white keys that are supposed to be colored, then draw them in colored...
      if (SelectedKeyArray.includes(index)) {
        if (!KeyLookup.isBlack)
          DrawWhiteKey(KeyLookup.White_Index, true, index);
      } else {
        drawKeyColor(KeyLookup, index);
      }
    }

    // draw in lowest a# manually (making sure to draw it colored if it should be)
    const LowestshouldBeSelected = SelectedKeyArray.includes(1);
    drawBlackKey(0, LowestshouldBeSelected);

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


    // now draw specially black keys that need to be colored...
    // just loop through all the SelectedKeyArray
    for (let index = 0; index <= 88; index++) {
      // and if we find any black keys that are supposed to be colored, then draw them in color...
      let KeyLookup = AbsoluteToKeyInfo(index);
      if (SelectedKeyArray.includes(index)) {
        if (KeyLookup.isBlack)
          drawBlackKey(KeyLookup.White_Index, true, index);
      } else if (KeyLookup.isBlack) {
        drawKeyColor(KeyLookup, index);
      }
    }
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('container')
);
