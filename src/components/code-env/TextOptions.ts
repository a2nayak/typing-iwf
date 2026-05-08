import * as monaco from "monaco-editor";

import { EditorManager } from "./EditorManager";

export class TextOptions {
    private editorManager: EditorManager;
    private focusedOptionIndex: number;
    private options: string[];

    private linesRange: monaco.Range | null = null;

    private baseDecoration: monaco.editor.IEditorDecorationsCollection | null = null;
    private optionDecorations: monaco.editor.IEditorDecorationsCollection[] = [];
    private boundKeyDown: (e: KeyboardEvent) => void;

    constructor(editorManager: EditorManager, options: string[]) {
        this.editorManager = editorManager;
        this.focusedOptionIndex = 0;
        this.options = options;
        this.boundKeyDown = this.keyDownHandler.bind(this);
        document.addEventListener("keydown", this.boundKeyDown);
    }

    highlightCurrentOption() {
        let newDecorations: monaco.editor.IEditorDecorationsCollection[] = []; 
        this.optionDecorations.forEach(decoration => {
            let range = decoration.getRange(0);
            if(!range) return;
            decoration.clear();
            newDecorations.push(this.editorManager.decorateRange(
                range,
                this.optionDecorations.indexOf(decoration) === this.focusedOptionIndex ? "nyku-line-selected" : "nyku-line-not-selected"
            ));
        });
        this.optionDecorations = newDecorations;
    }

    keyDownHandler(e: KeyboardEvent) {
        e.preventDefault();
        if (e.key === "ArrowUp") this.focusedOptionIndex--;
        else if (e.key === "ArrowDown") this.focusedOptionIndex++;
        if (e.key === "Tab") {
            if (e.shiftKey) this.focusedOptionIndex--;
            else this.focusedOptionIndex++;
            // for tab, wrap around the options
            this.focusedOptionIndex = (this.focusedOptionIndex + this.options.length) % this.options.length;
        }
        this.focusedOptionIndex = Math.max(0, Math.min(this.focusedOptionIndex, this.options.length - 1));
        if(e.key === "ArrowUp" || e.key === "ArrowDown") {
            console.log("Focused option index: ", this.focusedOptionIndex);
        }
        this.highlightCurrentOption();
    }


    async send(){
        for(let i = 0; i < this.options.length; i++) {
            const range = await this.editorManager.sendTextLine(`${this.options[i]}`);
            this.optionDecorations.push(this.editorManager.decorateRange(range));
        }
        this.highlightCurrentOption();

        let optionLineStart = this.optionDecorations[0]?.getRange(0)?.startLineNumber ?? 0;
        let optionLineEnd = this.optionDecorations[this.optionDecorations.length - 1]?.getRange(0)?.endLineNumber ?? 0;
        this.linesRange = new monaco.Range(optionLineStart, 1, optionLineEnd + 1, 1);
        this.baseDecoration = this.editorManager.decorateRange(this.linesRange, "nyku-fadeIn");
        setTimeout(() => {this.baseDecoration?.clear();}, 700);
    }

    async remove() {
        if(!this.linesRange) return;
        this.baseDecoration?.clear();
        this.optionDecorations.forEach(decoration => decoration.clear());
        await this.editorManager.deleteLines(this.linesRange);
        document.removeEventListener("keydown", this.boundKeyDown);
    }
}