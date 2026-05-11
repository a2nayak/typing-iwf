import * as monaco from "monaco-editor";
import { CodeStreamer } from "./CodeStreamer";

export class EditorManager {
    private editor: monaco.editor.IStandaloneCodeEditor;
    private streamer: CodeStreamer;

    constructor (editor: monaco.editor.IStandaloneCodeEditor) {
        this.editor = editor;
        this.editor.updateOptions({
            readOnly: true,
            readOnlyMessage: { value: "It's not your turn to type yet!" },
            scrollbar: { vertical: "hidden", horizontal: "hidden", handleMouseWheel: false },
        });

        const node = this.editor.getDomNode();
        if (node) {
            const onWheel = (e: Event) => e.preventDefault();
            node.addEventListener("wheel", onWheel as EventListener, { passive: false });
            node.tabIndex = -1; // make editor focusable for keydown events
        }
        
        this.streamer = new CodeStreamer(editor, { chunkSize: 10, delayMs: 60 });
    }
    
    showCursor() {
        this.editor.getDomNode()?.classList.remove("hide-cursor");
    }

    hideCursor() {
        this.editor.getDomNode()?.classList.add("hide-cursor");
    }

    decorateRange(range: monaco.Range, className: string = "nyku-empty-decoration") {
        return this.editor.createDecorationsCollection([
            {
                range: range,
                options: {
                    // isWholeLine: true,
                    // className: className,
                    inlineClassName: className,
                },
            },
        ]);    
    }

    // Streaming control
    async sendTextStream(chunk: string) {
      const p = this.streamer.streamChunk(chunk);
      this.streamer.start();
      await p;
    }

    async sendDirectText(text: string) {
        this.streamer.append(text);
    }

    private getCurrentIndent() {
        const model = this.editor.getModel()!;
        const lastLine = model.getLineCount();
        const lastLineContent = model.getLineContent(lastLine);
        const indentMatch = lastLineContent.match(/^(\s*)/);
        return indentMatch ? indentMatch[1] : "";
    }

    async sendTextLine(text: string): Promise<monaco.Range> {
        const indent = this.getCurrentIndent();
        let ret = new monaco.Range(
             this.editor.getModel()!.getLineCount(), indent.length + 1, 
             this.editor.getModel()!.getLineCount(), indent.length + 1 + text.length);
        this.streamer.append(text + "\n" + indent);
        return ret;
    }

    async sendTextLineStream(text: string): Promise<monaco.Range | null> {
        const indent = this.getCurrentIndent();
        let ret = new monaco.Range(
             this.editor.getModel()!.getLineCount(), indent.length + 1, 
             this.editor.getModel()!.getLineCount(), indent.length + 1 + text.length);
        await this.sendTextStream(text + "\n" + indent);
        return ret;
    }

    async sendText(text: string) {
        if (!this.streamer) return;
        const indent = this.getCurrentIndent();
        this.streamer.append(text + indent);
    }

    async deleteLines(range: monaco.Range) {
        const model = this.editor.getModel()!;
        const startLine = range.startLineNumber;
        const endLine = range.endLineNumber;
        const rangeToDelete = new monaco.Range(startLine, 1, endLine + 1, 1);
        model.pushEditOperations([], [{ range: rangeToDelete, text: "" }], () => null);
    }

    async replaceLineRange(range: monaco.Range, text: string) {
        const model = this.editor.getModel()!;
        model.pushEditOperations([], [{ range: range, text: text }], () => null);
        return new monaco.Range(
            range.startLineNumber, 
            range.startColumn, 
            range.startLineNumber, 
            range.startColumn + text.length
        );
    }

    enableEditing() {
        this.setReadOnly(false);
    }

    disableEditing() {
        this.setReadOnly(true);
    }

    private setReadOnly(readOnly: boolean) {
        this.editor.updateOptions({ readOnly });
    }

    pauseStreaming() {
        this.streamer?.pause();
    }

    resumeStreaming() {
        this.streamer?.start();
    }

    stopStreaming() {
        this.streamer?.stop();
    }


    registerPersistentKeyListener(targetKey: string, callback: () => void) {
        const listener = (e: KeyboardEvent) => {
            if (e.key === targetKey) {
                callback();
            }
        };
        document.addEventListener("keydown", listener);
        return () => document.removeEventListener("keydown", listener);
    }
    
    registerSingleKeyListener(targetKey: string, callback: () => void) {
        const listener = (e: KeyboardEvent) => {
            if (e.key === targetKey) {
                document.removeEventListener("keydown", listener);
                callback();
            }
        };
        document.addEventListener("keydown", listener);
    }

    async waitForKeyPress(targetKey: string): Promise<void> {
        return new Promise((resolve) => {
            this.registerSingleKeyListener(targetKey, resolve);
        });
    }

    focus() {
        this.editor.getDomNode()?.focus({ preventScroll: true });
        console.log(document.activeElement);
    }
}

