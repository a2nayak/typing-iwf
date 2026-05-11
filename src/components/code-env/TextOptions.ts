import * as monaco from "monaco-editor";

import { EditorManager } from "./EditorManager";
import { matchPrefix } from "../util/Utils";

//TODO: decouple ranges from the decorations
export class TextOptions {
    private editorManager: EditorManager;
    private options: string[];
    private correctOptionIndex: number = 0;

    private optionViewToggle: boolean = false;

    // this range is for the entire line
    private linesRange: monaco.Range | null = null;

    private baseDecoration: monaco.editor.IEditorDecorationsCollection | null = null;
    private optionDecorations: monaco.editor.IEditorDecorationsCollection[] = [];
    private optionSubDecorations: monaco.editor.IEditorDecorationsCollection[] = [];

    private currentInput: string = "";

    private removeKeyListener: (() => void) | null = null;
    private answerResolver: ((correct: boolean) => void) | null = null;

    private COLOR_MATCH = "rgba(39, 34, 185, 0.938)";
    private COLOR_CORRECT = "rgba(49, 105, 47, 0.94)";
    private COLOR_INCORRECT = "rgba(122, 46, 43, 0.94)";
    private ANSWER_FLASH_DURATION_MS = 750;

    constructor(editorManager: EditorManager, options: string[], correctOptionIndex: number) {
        this.editorManager = editorManager;
        this.options = options;
        this.correctOptionIndex = correctOptionIndex;
        this.removeKeyListener = this.editorManager.registerPersistentKeyListener("Enter", () => {
            this.validateCurrentInput();
        });
    }

    async waitForCorrectAnswer() {
        // return a promise that resolves when the user selects the correct answer
        if (this.answerResolver) {
            // already waiting
            return new Promise<boolean>((res) => res(false));
        }
        return new Promise<boolean>((resolve) => {
            this.answerResolver = (correct: boolean) => {
                this.answerResolver = null;
                resolve(correct);
            };
        });
    }

    async flashColor(isCorrect: boolean) {
        const editorElement = document.querySelector(".monaco-editor") as HTMLElement;
        editorElement.style.setProperty("--nyku-option-bg", isCorrect ? this.COLOR_CORRECT : this.COLOR_INCORRECT);
        await new Promise(resolve => setTimeout(resolve, this.ANSWER_FLASH_DURATION_MS));
        editorElement.style.setProperty("--nyku-option-bg", this.COLOR_MATCH);
    }

    async validateCurrentInput(){
        const prefix = matchPrefix(this.options[this.correctOptionIndex], this.currentInput);
        if(prefix !== this.options[this.correctOptionIndex]) {
            console.log("Incorrect answer selected!");
            await this.flashColor(false);
            return;
        }
        await this.flashColor(true);
        // resolve waiting promise if present
        if (this.answerResolver) this.answerResolver(true);
        this.removeKeyListener?.();
    }

    highlightCurrentOption() {
        let newDecorations: monaco.editor.IEditorDecorationsCollection[] = []; 
        this.optionDecorations.forEach(decoration => {
            let range = decoration.getRange(0);
            if(!range) return;
            decoration.clear();
            newDecorations.push(this.editorManager.decorateRange(
                range,
            ));
        });
        this.optionDecorations = newDecorations;
    }

    async send(){
        for(let i = 0; i < this.options.length; i++) {
            const range = await this.editorManager.sendTextLine(`${this.options[i]}`);
            this.optionDecorations.push(this.editorManager.decorateRange(range));
            this.optionSubDecorations.push(this.editorManager.decorateRange(range));
        }
        this.highlightCurrentOption();

        let optionLineStart = this.optionDecorations[0]?.getRange(0)?.startLineNumber ?? 0;
        let optionLineEnd = this.optionDecorations[this.optionDecorations.length - 1]?.getRange(0)?.endLineNumber ?? 0;
        this.linesRange = new monaco.Range(optionLineStart, 1, optionLineEnd + 1, 1);
        this.baseDecoration = this.editorManager.decorateRange(this.linesRange, "nyku-fadeIn");
        this.toggleOptionView();
        //wait 700ms
        await new Promise(resolve => setTimeout(resolve, 700));
        this.baseDecoration?.clear();
    }

    async remove() {
        if(!this.linesRange) return;
        this.baseDecoration?.clear();
        this.optionDecorations.forEach(decoration => decoration.clear());
        this.optionSubDecorations.forEach(decoration => decoration.clear());
        // if someone is waiting, resolve false (options removed)
        if (this.answerResolver) {
            this.answerResolver(false);
            this.answerResolver = null;
        }
        await this.editorManager.deleteLines(this.linesRange);
    }
    
    /*
        Note: this clears decorations
        TODO: make it so that it doesn't clear decorations and just updates the text of the options, this will require changes to the EditorManager to allow updating text without clearing decorations
    */
    async toggleOptionView(){
        console.log("Initial optionDecoration ranges: ", this.optionDecorations.map(decoration => decoration.getRange(0)));
        this.optionViewToggle = !this.optionViewToggle;
        
        if(!this.linesRange) return;
        
        // toggle arrow (>) in front of options
        for(let i = 0; i < this.options.length; i++) {
            let range = this.optionDecorations[i].getRange(0);
            if(!range) continue;
            let newRange = await this.editorManager.replaceLineRange(
                range, 
                `${this.optionViewToggle ? "> " : ""}${this.options[i]}`
            );
            this.optionDecorations[i].clear();
            this.optionDecorations[i] = this.editorManager.decorateRange(newRange);
        }
        console.log("OptionDecoration ranges after toggle: ", this.optionDecorations.map(decoration => decoration.getRange(0)));

        // toggle ghost text decoration for options
        if(!this.optionViewToggle) {
            for (let i = 0; i < this.options.length; i++) {
                let range = this.optionDecorations[i].getRange(0);
                if (!range) continue;
                this.optionDecorations[i].clear();
                this.optionDecorations[i] = this.editorManager.decorateRange(
                    range, "nyku-ghost-text"
                );
            }
        }
        console.log("Final optionDecoration ranges: ", this.optionDecorations.map(decoration => decoration.getRange(0)));
    }

    async updateOptionMatchHighlight() {
        if(this.optionSubDecorations.length === 0) return;
        this.optionSubDecorations.forEach(decoration => decoration.clear());
        //get prefix strings of match of each of the options[] with currentInput
        let prefixes = this.options.map(option => matchPrefix(option, this.currentInput));
        let newSubDecorations: monaco.editor.IEditorDecorationsCollection[] = [];
        for(let i = 0; i < this.options.length; i++) {
            let range = this.optionDecorations[i].getRange(0);
            if(!range) continue;
            newSubDecorations.push(this.editorManager.decorateRange(
                new monaco.Range(range.startLineNumber, range.startColumn, range.startLineNumber, range.startColumn + prefixes[i].length),
                "nyku-matching-text"
            ));
        }
        this.optionSubDecorations = newSubDecorations;
    }

    async updateInput(value: string) {
        if(!this.linesRange) return;

        //if currentInput toggles from empty/nonempty, then call toggleOptionView to add/remove ghost text decorations
        if(Math.min(value.length, this.currentInput.length) === 0 && value.length !== this.currentInput.length) {
            await this.toggleOptionView();
        }
        this.currentInput = value;
        await this.updateOptionMatchHighlight();
    }
}