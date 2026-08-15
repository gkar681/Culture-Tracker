declare module 'whisper.rn' {
  export type TranscribeResult = {
    result: string;
    isAborted: boolean;
  };

  export type WhisperContext = {
    transcribe: (
      filePath: string,
      options?: { language?: string; prompt?: string; maxThreads?: number },
    ) => {
      promise: Promise<TranscribeResult>;
    };
    release: () => Promise<void>;
  };

  export function initWhisper(options: {
    filePath: string;
    useCoreMLIos?: boolean;
    useGpu?: boolean;
  }): Promise<WhisperContext>;
}
