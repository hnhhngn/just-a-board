export class EditNoteTextCmd {
  constructor(note, oldText, newText) {
    this.note = note;
    this.oldText = oldText;
    this.newText = newText;
  }

  execute() {
    this.note.setText(this.newText);
  }

  undo() {
    this.note.setText(this.oldText);
  }
}
