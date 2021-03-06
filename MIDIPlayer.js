const INTERVAL = 50;

class MIDIPlayerClass {
  constructor() {
    MIDI.loadPlugin({ instrument: 'acoustic_grand_piano' });
    loadSong();
    this.init();
    this._noteChecker = this._noteChecker.bind(this);
  }

  init() {
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
    this.totalPlayTime = this._notes[this._notes.length - 1].time;
    delete this._songStart;
  }

  noteUnits() {
    const units = [];
    const noteStorage = {};
    this._notes.forEach(note => {
      if (note.subtype === 'noteOn') {
        noteStorage[note.note] = {
          startTime: note.time,
          velocity: note.velocity,
          note: note.note
        };
      } else if (note.subtype === 'noteOff' && noteStorage[note.note]) {
        noteStorage[note.note].endTime = note.time;
        units.push(noteStorage[note.note]);
        delete noteStorage[note.note];
      }
    });
    return units;
  }

  changePlaySpeed(playSpeed) {
    for (let index = 0; index < this._notes.length; index++) {
      this._notes[index].time = this._notes[index].originalTime / playSpeed;
    }
    this.totalPlayTime = this._notes[this._notes.length - 1].time;
  }

  currentTime() {
    if (this._songStart) {
      if (this._pauseOffset) {
        return this._pauseOffset - this._songStart;
      }
      return performance.now() - this._songStart;
    }
    return 0;
  }

  restart() {
    delete this._pauseOffset;
    this._songStart = performance.now();
    this._startLoop();
    this._notesPlayed = 0;
  }

  pause() {
    this._pauseOffset = performance.now();
    this._stopLoop();
  }

  resume() {
    if (this._pauseOffset) {
      this._songStart += performance.now() - this._pauseOffset;
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

  save() {
    return {
      notes: this._notes,
      totalPlayTime: this.totalPlayTime,
      songStartOffset: this.currentTime(),
      notesPlayed: this._notesPlayed,
    };
  }

  restore(data) {
    this.restart();
    this._notes = data.notes;
    this._songStart = performance.now() - data.songStartOffset;
    this.totalPlayTime = data.totalPlayTime;
    this._notesPlayed = data.notesPlayed;
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
    if (nowTime > this.totalPlayTime) {
      this.pause();
      return;
    }
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
    // if (note.subtype === 'noteOn') {
    //   this.noteOn(0, note.note, note.velocity, 0);
    // } else if (note.subtype === 'noteOff') {
    //   this.noteOff(0, note.note, 0);
    // }
  }
}

window.MIDIPlayer = new MIDIPlayerClass();