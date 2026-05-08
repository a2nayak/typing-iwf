
export interface VisualCodeNovel {
    sections: {
        context: string;
        prompt: string;
        choices: string[];
        correctChoiceIndex: number;
    }[];
}