import Editor from "@monaco-editor/react";
import ClaudeText from "../util/ClaudeText";
import styles from "./CodingEnv.module.css";

import { useRef, useEffect } from "react";
import { VCNHandler } from "./VCNHandler";
import { TextOptions } from "./TextOptions";

function CodingEnv() {
  const vcnHandlerRef = useRef<VCNHandler | null>(null);
  const textOptionsRef = useRef<TextOptions | null>(null);
  return (
    <>
      <h1 style={{ userSelect: "none" }}>
        <ClaudeText /> <span className={styles.simulatorText}>Simulator</span>
      </h1>
      <Editor
        height="500px"
        defaultLanguage="javascript"
        defaultValue={"// press enter to begin ...\n"}
        theme="vs-dark"
        options= {{
            minimap: {
                enabled: false,
            },
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
                handleMouseWheel: false,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollBeyondLastLine: false,
        }}
        beforeMount={(monaco) => {
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: true,
            });
        }}
        onMount={(editor) => {
            vcnHandlerRef.current = new VCNHandler(null, editor); 
            vcnHandlerRef.current.play();
        }}
      />
    </>
  );
}

export default CodingEnv