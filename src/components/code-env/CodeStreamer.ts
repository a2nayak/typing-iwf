import * as monaco from "monaco-editor";

type StreamOptions = {
  chunkSize?: number;
  delayMs?: number;
};

export class CodeStreamer {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private model: monaco.editor.ITextModel;

  private content: string = "";
  private index = 0; // index within current string

  private callback: (() => void) | null = null;
  private streamResolver: (() => void) | null = null;

  private chunkSize: number;
  private delayMs: number;

  private timer: any = null;
  private running = false;

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    options?: StreamOptions
  ) {
    this.editor = editor;
    this.model = editor.getModel()!;
    this.chunkSize = options?.chunkSize ?? 80;
    this.delayMs = options?.delayMs ?? 10;
  }

  // stream a single chunk (string). Returns a Promise that resolves when the chunk finishes.
  async streamChunk(content: string): Promise<void> {
    this.content = content;
    this.index = 0;

    return new Promise((resolve) => {
      this.streamResolver = resolve;
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  pause() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }

  stop() {
    this.pause();
  }

  reset() {
    this.stop();
    this.index = 0;
    this.model.setValue("");
  }

  destroy() {
    this.stop();
  }

  private tick = () => {
    if (!this.running) return;

    const current = this.content;
    const nextIndex = Math.min(this.index + this.chunkSize, current.length);

    const chunk = current.slice(this.index, nextIndex);
    this.index = nextIndex;

    this.append(chunk);

    if (this.index < current.length) {
      this.timer = setTimeout(this.tick, this.delayMs);
    } else {
      // finished current string: move cursor to next line at same indent, then pause and call callback
      this.moveCursorToNextLineSameIndent();

      const cb = this.callback;
      this.index = 0;
      this.running = false; // pause after each string as requested
      if (cb) cb();
      if (this.streamResolver) {
        this.streamResolver();
        this.streamResolver = null;
      }
    }
  };

  private moveCursorToNextLineSameIndent() {
    const model = this.model;
    const editor = this.editor;

    const lastLine = model.getLineCount();
    const lastLineContent = model.getLineContent(lastLine) || "";
    const m = lastLineContent.match(/^(\s*)/);
    const indent = m ? m[1] : "";

    const lastColumn = model.getLineMaxColumn(lastLine);

    // If the last line is blank (only whitespace), don't insert another newline;
    // just move the cursor to that line at the indent. Otherwise insert newline+indent.
    if (lastLineContent.trim() === "") {
      // find previous non-blank line to determine indent
      let prevLine = lastLine - 1;
      let prevIndent = indent;
      while (prevLine > 0) {
        const content = model.getLineContent(prevLine) || "";
        if (content.trim() !== "") {
          const m2 = content.match(/^(\s*)/);
          prevIndent = m2 ? m2[1] : "";
          break;
        }
        prevLine -= 1;
      }

      const targetLine = lastLine;
      const targetColumn = prevIndent.length + 1;
      // insert indent if the blank line doesn't already have it
      if (lastLineContent.indexOf(prevIndent) !== 0) {
        model.applyEdits([
          {
            range: new monaco.Range(lastLine, 1, lastLine, 1),
            text: prevIndent,
          },
        ]);
      }

      editor.setPosition({ lineNumber: targetLine, column: targetColumn });
      editor.revealLine(targetLine);
    } else {
      model.applyEdits([
        {
          range: new monaco.Range(lastLine, lastColumn, lastLine, lastColumn),
          text: "\n" + indent,
        },
      ]);

      const newLine = lastLine + 1;
      const newColumn = indent.length + 1;

      editor.setPosition({ lineNumber: newLine, column: newColumn });
      editor.revealLine(newLine);
    }
  }

  public append(text: string) {
    const model = this.model;

    const lastLine = model.getLineCount();
    const lastColumn = model.getLineMaxColumn(lastLine);

    model.applyEdits([
      {
        range: new monaco.Range(
          lastLine,
          lastColumn,
          lastLine,
          lastColumn
        ),
        text,
      },
    ]);

    this.editor.revealLine(lastLine);
  }
}