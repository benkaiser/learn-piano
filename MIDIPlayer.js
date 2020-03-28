const INTERVAL = 50;

class MIDIPlayerClass {
  constructor() {
    MIDI.loadPlugin({ instrument: 'acoustic_grand_piano' });
    loadSong();
    this._processNotes();
    this._noteChecker = this._noteChecker.bind(this);
  }

  _processNotes() {
    this._notes = [];
    let time = 0;
    MIDI.Player.data.forEach(data => {
      time += data[1];
      if (data[0].event && data[0].event.noteNumber) {
        this._notes.push({
          time: time,
          originalTime: time,
          note: data[0].event.noteNumber,
          subtype: data[0].event.subtype,
          velocity: data[0].event.velocity
        });
      }
    });
  }

  changePlaySpeed(playSpeed) {
    for (let index = 0; index < this._notes.length; index++) {
      this._notes[index].time = this._notes[index].originalTime / playSpeed;
    }
  }

  restart() {
    delete this._pauseOffset;
    this._songStart = performance.now();
    this._originalSongStart = this._songStart;
    this._startLoop();
    this._notesPlayed = 0;
    this._lastNotePlayTime = 0;
  }

  pause() {
    this._pauseOffset = performance.now();
    this._stopLoop();
  }

  resume() {
    if (this._pauseOffset) {
      this._songStart += performance.now() - this._pauseOffset;
      this._originalSongStart += performance.now() - this._pauseOffset;
      delete this._pauseOffset;
      this._startLoop();
    }
  }

  noteOn(channel, note, velocity, delay) {
    MIDI.noteOn(channel, note, velocity, delay);
  }

  noteOff(channel, note, delay) {
    MIDI.noteOff(channel, note, delay);
  }

  _startLoop() {
    this._animationFrameRef && cancelAnimationFrame(this._animationFrameRef);
    this._animationFrameRef = requestAnimationFrame(this._noteChecker);
  }

  _stopLoop() {
    clearTimeout(this._animationFrameRef);
  }

  _noteChecker() {
    const nowTime = performance.now() - this._songStart;
    for (let index = this._notesPlayed; index < this._notes.length; index++) {
      let currentNote = this._notes[index];
      if (nowTime > currentNote.time) {
        this._processNote(currentNote);
        this._notesPlayed++;
      } else {
        if (!this._pauseOffset) {
          this._animationFrameRef = requestAnimationFrame(this._noteChecker);
        }
        return;
      }
    }
  }

  _processNote(note) {
    if (this.onNotePlayed) {
      this.onNotePlayed(note);
    }
    if (note.subtype === 'noteOn') {
      this.noteOn(0, note.note, note.velocity, 0);
    } else if (note.subtype === 'noteOff') {
      this.noteOff(0, note.note, 0);
    }
  }
}

window.MIDIPlayer = new MIDIPlayerClass();