class RNNoiseWorkletProcessor extends AudioWorkletProcessor {
  constructor(options = {}) {
    super();

    this.frameSize = 480;
    this.defaultBlockSize = 128;
    this.sampleScale = 32768;
    this.queueCapacity = this.frameSize * 24;

    this.inputQueue = new Float32Array(this.queueCapacity);
    this.outputQueue = new Float32Array(this.queueCapacity);
    this.inputReadIndex = 0;
    this.inputWriteIndex = 0;
    this.inputCount = 0;
    this.outputReadIndex = 0;
    this.outputWriteIndex = 0;
    this.outputCount = 0;

    this.frameInput = new Float32Array(this.frameSize);
    this.frameOutput = new Float32Array(this.frameSize);
    this.silenceBlock = new Float32Array(this.defaultBlockSize);
    this.lastOutputSample = 0;
    this.dcFilterPreviousInput = 0;
    this.dcFilterPreviousOutput = 0;
    this.playbackPrimed = false;
    this.primeOutputSamples = this.frameSize * 2;

    this.ready = false;
    this.fatalError = null;

    this.wasmMemory = null;
    this.wasmExports = null;
    this.wasmHeapF32 = null;
    this.statePtr = 0;
    this.inFramePtr = 0;
    this.outFramePtr = 0;
    this.processFn = null;
    this.allocateFn = null;
    this.freeFn = null;
    this.destroyStateFn = null;

    const configuredWasmUrl = options?.processorOptions?.wasmUrl;
    this.wasmUrl = typeof configuredWasmUrl === "string" && configuredWasmUrl.trim()
      ? configuredWasmUrl.trim()
      : "/js/libs/rnnoise.wasm";

    this.port.onmessage = (event) => {
      if (event?.data?.type === "dispose") {
        this.dispose();
      }
    };

    this.wasmInitPromise = this.initializeWasm();
  }

  async initializeWasm() {
    let memoryRef = null;
    const imports = {
      a: {
        // Abort / assert hook in this build.
        a: () => 0,
        // memcpy / memmove hook in this build.
        b: (dest, src, len) => {
          if (!memoryRef) {
            return dest >>> 0;
          }
          const destination = dest >>> 0;
          const source = src >>> 0;
          const length = len >>> 0;
          const heapU8 = new Uint8Array(memoryRef.buffer);
          heapU8.copyWithin(destination, source, source + length);
          return destination;
        },
      },
    };

    try {
      const response = await fetch(this.wasmUrl, { cache: "force-cache" });
      if (!response.ok) {
        throw new Error(`RNNoise WASM load failed (${response.status})`);
      }

      const wasmBytes = await response.arrayBuffer();
      const module = await WebAssembly.compile(wasmBytes);
      const instance = await WebAssembly.instantiate(module, imports);
      const exports = instance.exports || {};

      if (!(exports.c instanceof WebAssembly.Memory)) {
        throw new Error("RNNoise memory export is missing.");
      }
      if (typeof exports.f !== "function" || typeof exports.g !== "function" || typeof exports.j !== "function") {
        throw new Error("RNNoise function exports are incomplete.");
      }

      this.wasmExports = exports;
      this.wasmMemory = exports.c;
      memoryRef = this.wasmMemory;

      if (typeof exports.d === "function") {
        try {
          exports.d();
        } catch (_error) {}
      }

      this.processFn = exports.j.bind(exports);
      this.allocateFn = exports.g.bind(exports);
      this.destroyStateFn = typeof exports.h === "function" ? exports.h.bind(exports) : null;
      this.freeFn = typeof exports.i === "function" ? exports.i.bind(exports) : null;

      this.statePtr = exports.f(0) >>> 0;
      this.inFramePtr = this.allocateFn(this.frameSize * 4) >>> 0;
      this.outFramePtr = this.allocateFn(this.frameSize * 4) >>> 0;
      if (!this.statePtr || !this.inFramePtr || !this.outFramePtr) {
        throw new Error("RNNoise WASM allocation failed.");
      }

      this.ensureHeapViews();
      this.ready = true;
      this.port.postMessage({ type: "ready" });
    } catch (error) {
      this.fatalError = String(error?.message || error || "Unknown RNNoise initialization error.");
      this.ready = false;
      this.port.postMessage({ type: "error", message: this.fatalError });
    }
  }

  ensureHeapViews() {
    if (!this.wasmMemory) {
      return;
    }
    if (!this.wasmHeapF32 || this.wasmHeapF32.buffer !== this.wasmMemory.buffer) {
      this.wasmHeapF32 = new Float32Array(this.wasmMemory.buffer);
    }
  }

  ensureSilenceBlock(length) {
    if (!this.silenceBlock || this.silenceBlock.length !== length) {
      this.silenceBlock = new Float32Array(length);
    }
    return this.silenceBlock;
  }

  copyBlock(target, source) {
    const sourceBlock = source || this.ensureSilenceBlock(target.length);
    const sourceLength = sourceBlock.length;
    for (let i = 0; i < target.length; i += 1) {
      target[i] = i < sourceLength ? sourceBlock[i] : 0;
    }
  }

  enqueueInputSamples(samples) {
    if (!samples) {
      return;
    }
    for (let i = 0; i < samples.length; i += 1) {
      if (this.inputCount >= this.queueCapacity) {
        this.inputReadIndex = (this.inputReadIndex + 1) % this.queueCapacity;
        this.inputCount -= 1;
      }
      this.inputQueue[this.inputWriteIndex] = samples[i];
      this.inputWriteIndex = (this.inputWriteIndex + 1) % this.queueCapacity;
      this.inputCount += 1;
    }
  }

  dequeueInputFrame(targetFrame) {
    if (this.inputCount < this.frameSize) {
      return false;
    }
    for (let i = 0; i < this.frameSize; i += 1) {
      targetFrame[i] = this.inputQueue[this.inputReadIndex];
      this.inputReadIndex = (this.inputReadIndex + 1) % this.queueCapacity;
    }
    this.inputCount -= this.frameSize;
    return true;
  }

  enqueueOutputFrame(frame) {
    for (let i = 0; i < frame.length; i += 1) {
      if (this.outputCount >= this.queueCapacity) {
        this.outputReadIndex = (this.outputReadIndex + 1) % this.queueCapacity;
        this.outputCount -= 1;
      }
      this.outputQueue[this.outputWriteIndex] = frame[i];
      this.outputWriteIndex = (this.outputWriteIndex + 1) % this.queueCapacity;
      this.outputCount += 1;
    }
  }

  drainOutputSamples(target, fallback) {
    const fallbackBlock = fallback || this.ensureSilenceBlock(target.length);
    const hasEnough = this.outputCount >= target.length;
    for (let i = 0; i < target.length; i += 1) {
      if (this.outputCount > 0) {
        const sample = this.outputQueue[this.outputReadIndex];
        target[i] = sample;
        this.lastOutputSample = sample;
        this.outputReadIndex = (this.outputReadIndex + 1) % this.queueCapacity;
        this.outputCount -= 1;
      } else {
        const fallbackSample = i < fallbackBlock.length ? fallbackBlock[i] : 0;
        const smoothedFallback = Math.abs(fallbackSample) > 0.000001
          ? fallbackSample
          : (this.lastOutputSample * 0.995);
        target[i] = smoothedFallback;
        this.lastOutputSample = smoothedFallback;
      }
    }
    return hasEnough;
  }

  processRNNoiseFrame() {
    if (!this.ready || !this.processFn || !this.statePtr || !this.inFramePtr || !this.outFramePtr) {
      return false;
    }
    if (!this.dequeueInputFrame(this.frameInput)) {
      return false;
    }

    this.ensureHeapViews();
    const inBase = this.inFramePtr >>> 2;
    const outBase = this.outFramePtr >>> 2;
    for (let i = 0; i < this.frameSize; i += 1) {
      this.wasmHeapF32[inBase + i] = this.frameInput[i] * this.sampleScale;
    }

    try {
      // This RNNoise build expects: process(statePtr, outFramePtr, inFramePtr)
      this.processFn(this.statePtr, this.outFramePtr, this.inFramePtr);
    } catch (error) {
      this.fatalError = String(error?.message || error || "RNNoise frame process error.");
      this.ready = false;
      this.port.postMessage({ type: "error", message: this.fatalError });
      return false;
    }

    for (let i = 0; i < this.frameSize; i += 1) {
      const normalizedSample = this.wasmHeapF32[outBase + i] / this.sampleScale;
      // Lightweight DC blocker to reduce low-frequency hum in headsets.
      const dcFiltered = normalizedSample - this.dcFilterPreviousInput + (0.995 * this.dcFilterPreviousOutput);
      this.dcFilterPreviousInput = normalizedSample;
      this.dcFilterPreviousOutput = dcFiltered;
      this.frameOutput[i] = Math.max(-1, Math.min(1, dcFiltered));
    }
    this.enqueueOutputFrame(this.frameOutput);
    return true;
  }

  process(inputs, outputs) {
    const outputChannel = outputs?.[0]?.[0];
    if (!outputChannel) {
      return true;
    }

    const inputChannel = inputs?.[0]?.[0] || this.ensureSilenceBlock(outputChannel.length);

    if (!this.ready || this.fatalError) {
      this.copyBlock(outputChannel, inputChannel);
      return true;
    }

    this.enqueueInputSamples(inputChannel);
    while (this.inputCount >= this.frameSize && this.outputCount <= (this.queueCapacity - this.frameSize)) {
      if (!this.processRNNoiseFrame()) {
        break;
      }
    }

    if (!this.playbackPrimed) {
      if (this.outputCount >= this.primeOutputSamples) {
        this.playbackPrimed = true;
      } else {
        this.copyBlock(outputChannel, this.ensureSilenceBlock(outputChannel.length));
        return true;
      }
    }

    this.drainOutputSamples(outputChannel, this.ensureSilenceBlock(outputChannel.length));
    return true;
  }

  dispose() {
    if (!this.wasmExports) {
      return;
    }

    try {
      if (this.freeFn && this.inFramePtr) {
        this.freeFn(this.inFramePtr);
      }
    } catch (_error) {}
    try {
      if (this.freeFn && this.outFramePtr) {
        this.freeFn(this.outFramePtr);
      }
    } catch (_error) {}
    try {
      if (this.destroyStateFn && this.statePtr) {
        this.destroyStateFn(this.statePtr);
      }
    } catch (_error) {}

    this.inFramePtr = 0;
    this.outFramePtr = 0;
    this.statePtr = 0;
    this.ready = false;
    this.playbackPrimed = false;
  }
}

registerProcessor("rnnoise-worklet", RNNoiseWorkletProcessor);
