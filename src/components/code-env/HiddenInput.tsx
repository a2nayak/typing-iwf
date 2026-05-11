import { useEffect, useRef, useState } from "react";
import styles from "./CodingEnv.module.css";

type HiddenInputProps = {
    disabled?: boolean;
    onChange?: (value: string) => void;
    onMount?: (api: { getValue: () => string; setValue: (v: string) => void; clear: () => void }) => void;
};

function HiddenInput({ disabled = false, onChange, onMount }: HiddenInputProps) {
    const valueRef = useRef("");
    const composingRef = useRef(false);
    const [, setTick] = useState(0);

    useEffect(() => {
        if (disabled) return;

        const handleKeydown = (e: KeyboardEvent) => {
            if (disabled || composingRef.current) return;
            if (e.key.length === 1) {
                valueRef.current = valueRef.current + e.key;
                setTick((t) => t + 1);
                if (onChange) onChange(valueRef.current);
                e.preventDefault();
            } else if (e.key === "Backspace") {
                valueRef.current = valueRef.current.slice(0, -1);
                setTick((t) => t + 1);
                if (onChange) onChange(valueRef.current);
                e.preventDefault();
            } else if (e.key === "Enter") {
                if (onChange) onChange(valueRef.current);
            }
        };

        const handleCompositionStart = () => {
            composingRef.current = true;
        };
        const handleCompositionEnd = (e: CompositionEvent) => {
            composingRef.current = false;
            const data = e.data || "";
            valueRef.current = valueRef.current + data;
            setTick((t) => t + 1);
            if (onChange) onChange(valueRef.current);
        };

        document.addEventListener("keydown", handleKeydown);
        document.addEventListener("compositionstart", handleCompositionStart);
        document.addEventListener("compositionend", handleCompositionEnd as EventListener);

        return () => {
            document.removeEventListener("keydown", handleKeydown);
            document.removeEventListener("compositionstart", handleCompositionStart);
            document.removeEventListener("compositionend", handleCompositionEnd as EventListener);
        };
    }, [disabled, onChange]);

    // expose a small API to parent on mount
    useEffect(() => {
        if (!onMount) return;
        const api = {
            getValue: () => valueRef.current,
            setValue: (v: string) => {
                valueRef.current = v;
                setTick((t) => t + 1);
                if (onChange) onChange(v);
            },
            clear: () => {
                valueRef.current = "";
                setTick((t) => t + 1);
                if (onChange) onChange("");
            },
        };
        onMount(api);
        // no teardown required for this API
    }, [onMount, onChange]);

    // render floating debug text for current buffer
    return (
        <div aria-hidden className={styles.hiddenDebug}>{valueRef.current}</div>
    );
}

export default HiddenInput;