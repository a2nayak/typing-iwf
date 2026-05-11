import Editor from "@monaco-editor/react";
import ClaudeText from "../util/ClaudeText";
import styles from "./CodingEnv.module.css";

import { useRef, useEffect } from "react";
import { VCNHandler } from "./VCNHandler";
import HiddenInput from "./HiddenInput";

function CodingEnv() {
  const vcnHandlerRef = useRef<VCNHandler | null>(null);
  const hiddenApiRef = useRef<any>(null);
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
                allowUnreachableCode: true,
                diagnosticCodesToIgnore: [6133, 7027]
            });
        }}
        onMount={(editor) => {
            vcnHandlerRef.current = new VCNHandler(null, editor); 
            vcnHandlerRef.current.play();
            // if hidden input mounted earlier, link it now
            if (hiddenApiRef.current) {
              vcnHandlerRef.current.linkHiddenInput(hiddenApiRef.current);
            }
        }}
      />
        <HiddenInput
          onChange={(value) => vcnHandlerRef.current?.handleInput(value)}
          onMount={(api) => {
            hiddenApiRef.current = api;
            if (vcnHandlerRef.current) vcnHandlerRef.current.linkHiddenInput(api);
          }}
        />
    </>
  );
}

export default CodingEnv