import { EditorManager } from "./EditorManager";
import { TextOptions } from "./TextOptions";
import type { VisualCodeNovel } from "./VisualCodeNovel";
import * as monaco from "monaco-editor";

export class VCNHandler {
    novel: VisualCodeNovel;
    editorManager: EditorManager;
    currentSectionIndex: number;

    //TODO: make this like an enum
    game_state: "not_started" |
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
        
        await this.editorManager.sendTextStream(bubbleSortSegments()[0]);

        await this.editorManager.sendTextLineStream("// Set temp to arr[j]");
        
        let exampleOptions = new TextOptions(
            this.editorManager, 
            ["> int temp = arr[j];", "> set temp = arr[j];", "> let temp = arr[j];"]);

        await exampleOptions.send();

        await new Promise(resolve => setTimeout(resolve, 5000));

        await exampleOptions.remove();
    }
}

function bubbleSortSegments(){
  let baseCode = "" + 
`function bubbleSort(arr) {
  let n = arr.length;
  let swapped;

  for (let i = 0; i < n - 1; i++) {
    swapped = false;

    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        // swap elements
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;

        swapped = true;
      }
    }

    // If no swapping happened, array is already sorted
    if (!swapped) break;
  }

  return arr;
}`;
    // split this comment section: produce chunks that end with comment lines
    const lines = baseCode.split(/\r?\n/);
    const chunks: string[] = [];
    let acc: string[] = [];

    for (const line of lines) {
      if (line.trim() === "") {
        // preserve blank lines inside the accumulator
        acc.push(line);
        continue;
      }

      acc.push(line);

      if (line.trim().startsWith("//")) {
        // when a comment line is encountered, flush the accumulator as a chunk
        chunks.push(acc.join("\n") + "\n");
        acc = [];
      }
    }

    if (acc.length > 0) {
      chunks.push(acc.join("\n") + "\n");
    }

    return chunks;
}
