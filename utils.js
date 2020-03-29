function colorForNote(noteNumber) {
  if (!MIDI.noteToKey[noteNumber]) {
    return 'rgba(0,0,0)';
  }
  const key = MIDI.noteToKey[noteNumber].replace(/[0-9]/, '');
  switch (key) {
    case 'A':
      return 'rgb(248, 129, 18)';
    case 'Bb':
      return 'rgb(241, 243, 99)';
    case 'B':
      return 'rgb(245, 245, 61)';
    case 'C':
      return 'rgb(188, 224, 56)';
    case 'Db':
      return 'rgb(20, 144, 51)';
    case 'D':
      return 'rgb(28, 146, 130)';
    case 'Eb':
      return 'rgb(28, 13, 130)';
    case 'E':
      return 'rgb(125, 8, 121)';
    case 'F':
      return 'rgb(216, 19, 134)';
    case 'Gb':
      return 'rgb(110, 13, 68)';
    case 'G':
      return 'rgb(159, 12, 9)';
    case 'Ab':
      return 'rgb(250, 10, 10)';
  }
}

function keyType(isBlack, White_Index) {
  this.isBlack = isBlack;
  this.White_Index = White_Index
}

var TOTAL_KEYS = 88;
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

function AbsoluteToKeyInfo(AbsoluteNoteNum) {
  return KeyLookupTable[AbsoluteNoteNum];
}

CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x+r, y);
  this.arcTo(x+w, y,   x+w, y+h, r);
  this.arcTo(x+w, y+h, x,   y+h, r);
  this.arcTo(x,   y+h, x,   y,   r);
  this.arcTo(x,   y,   x+w, y,   r);
  this.closePath();
  return this;
}