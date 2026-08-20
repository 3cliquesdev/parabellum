declare module "opus-recorder" {
  interface RecorderConfig {
    encoderPath?: string;
    numberOfChannels?: number;
    encoderSampleRate?: number;
    encoderBitRate?: number;
    streamPages?: boolean;
  }

  export default class Recorder {
    constructor(config?: RecorderConfig);
    static isRecordingSupported(): boolean;
    ondataavailable: (data: ArrayBuffer) => void;
    onstart: () => void;
    onstop: () => void;
    start(): Promise<void>;
    stop(): void;
    close(): void;
  }
}
