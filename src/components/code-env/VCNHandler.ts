import { EditorManager } from "./EditorManager";
import { TextOptions } from "./TextOptions";
import type { VisualCodeNovel } from "./VisualCodeNovel";
import * as monaco from "monaco-editor";

export class VCNHandler {
    private novel: VisualCodeNovel;
    private editorManager: EditorManager;
    private currentSectionIndex: number;
    private activeOptions: TextOptions | null = null;
  private hiddenInputApi: { getValue: () => string; setValue: (v: string) => void; clear: () => void } | null = null;

    //TODO: make this like an enum
    private game_state: "not_started" |
                "context_stream" |
                "choice_prompt" |
                "user_input" = "not_started";  

    constructor(novel: VisualCodeNovel | any, editor: monaco.editor.IStandaloneCodeEditor) {
        this.novel = novel;
        this.editorManager = new EditorManager(editor);
        this.currentSectionIndex = 0;
    }
    
    async play() {
        this.editorManager.hideCursor();

        await this.editorManager.waitForKeyPress("Enter");
        await this.editorManager.sendTextStream(bubbleSortSegments()[0]);
        await this.editorManager.sendTextLineStream("// Set temp to arr[j]");
        
        this.activeOptions = new TextOptions(
            this.editorManager, 
            ["int temp = arr[j];", "set temp = arr[j];", "let temp = arr[j];"],
            2
        );

        await this.activeOptions.send();
        await this.activeOptions.waitForCorrectAnswer();
        await this.activeOptions.remove();

        //TODO: restore the indent in active options instead of just sending the line like this
        await this.editorManager.sendTextLine("        let temp = arr[j];");

        this.hiddenInputApi?.clear();

        await this.editorManager.sendTextStream(bubbleSortSegments()[1]);
        await this.editorManager.sendTextLineStream("// Break if no swaps happened");

        this.activeOptions = new TextOptions(
            this.editorManager, 
            ["if !swapped then break;", "if (!swapped) break;", "if not swapped: break;"],
            1
        );

        await this.activeOptions.send();
        await this.activeOptions.waitForCorrectAnswer();
        await this.activeOptions.remove();

        this.hiddenInputApi?.clear();

        await this.editorManager.sendTextLine("    if (!swapped) break;");

        await this.editorManager.sendTextStream(bubbleSortSegments()[2]);

        await this.editorManager.sendTextStream(
`
/*
            good job
*/`);

        this.activeOptions = null;
    }

    handleInput(value: string) {
        this.activeOptions?.updateInput(value);
        console.log("User input:", value);
    }

    linkHiddenInput(api: { getValue: () => string; setValue: (v: string) => void; clear: () => void }) {
      this.hiddenInputApi = api;
    }
}

function bubbleSortSegments(){
  return [
`function bubbleSort(arr) {
  let n = arr.length;
  let swapped;

  for (let i = 0; i < n - 1; i++) {
    swapped = false;

    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
`,
//      let temp = arr[j];  
`        arr[j] = arr[j + 1];
        arr[j + 1] = temp;

        swapped = true;
      }
    }

`,
//    if (!swapped) break;
`
  }

  return arr;
}`];
}
