      class Discord2AudioManager {
        constructor({ onLevelChange, onSpeakingChange, onStreamReady } = {}) {
          this.onLevelChange = typeof onLevelChange === "function" ? onLevelChange : () => {};
          this.onSpeakingChange = typeof onSpeakingChange === "function" ? onSpeakingChange : () => {};
          this.onStreamReady = typeof onStreamReady === "function" ? onStreamReady : () => {};

          this.settings = { ...DEFAULT_DISCORD2_PERSONAL_SETTINGS };
          this.muted = false;
          this.deafened = false;
          this.pushToTalkPressed = false;

          this.rawStream = null;
          this.transmitStream = null;
          this.transmitTrack = null;

          this.audioContext = null;
          this.sourceNode = null;
          this.inputGainNode = null;
          this.highpassNode = null;
          this.lowpassNode = null;
          this.rnnoiseWorkletNode = null;
          this.rnnoiseModuleLoaded = false;
          this.rnnoiseAvailable = false;
          this.rnnoiseLastError = null;
          this.transientCompressorNode = null;
          this.levelAnalyserNode = null;
          this.noiseDuckNode = null;
          this.transmitGateNode = null;
          this.destinationNode = null;

          this.levelSampleBuffer = null;
          this.frequencySampleBuffer = null;
          this.levelMonitorTimer = null;
          this.levelMonitorIntervalMs = 20;

          this.currentLevel = 0;
          this.currentRms = 0;
          this.manualThreshold = 0.5;
          this.autoThreshold = 0.18;
          this.speaking = false;
          this.speakingReleaseAt = 0;

          this.myVad = null;
          this.vadSpeaking = false;
          this.vadFrameTimestamp = 0;
          this.vadLastSpeechProbability = 0;
          this.vadSpeechProbabilityEma = 0;
          this.lastVadSpeechAt = 0;

          this.levelSpeaking = false;
          this.levelSpeakingReleaseAt = 0;
          this.noiseFloor = 0.04;
          this.keyboardNoiseScore = 0;
          this.keyboardNoiseLikely = false;
          this.keyboardNoiseDetectedAt = 0;

          this.micTestAudio = null;
          this.micTestActive = false;
          this.outputDeviceId = "default";

          this.availableInputDevices = [];
          this.availableOutputDevices = [];
          this.activeInputDeviceId = null;
          this.activeRequestedDeviceId = null;
          this.activeNoiseSuppressionMode = null;
          this.activeEchoCancellation = null;
        }

        updateSettings(nextSettings) {
          this.settings = normalizeDiscord2PersonalSettings({
            ...this.settings,
            ...(nextSettings || {}),
          });
          this.manualThreshold = this.mapSensitivityToThreshold(this.settings.inputSensitivity);
          this.autoThreshold = this.settings.inputSensitivityAuto
            ? clamp(Math.max(this.noiseFloor + 0.08, this.noiseFloor * 1.7), 0.03, 0.82)
            : clamp(this.manualThreshold, 0.01, 0.92);
          this.outputDeviceId = this.settings.outputDeviceId || "default";

          this.setMicVolume(this.settings.micVolume);
          this.setOutputVolume(this.settings.outputVolume);

          this.applyProcessingProfile();
          this.updateTransmissionState({ force: true });
        }

        async enumerateDevices() {
          if (!navigator.mediaDevices?.enumerateDevices) {
            this.availableInputDevices = [];
            this.availableOutputDevices = [];
            return { inputDevices: [], outputDevices: [] };
          }

          const devices = await navigator.mediaDevices.enumerateDevices();
          const inputDevices = [];
          const outputDevices = [];

          devices.forEach((device) => {
            if (!device || !device.deviceId) {
              return;
            }
            if (device.kind === "audioinput") {
              inputDevices.push({
                deviceId: device.deviceId,
                label: device.label || `Microphone ${inputDevices.length + 1}`,
              });
              return;
            }
            if (device.kind === "audiooutput") {
              outputDevices.push({
                deviceId: device.deviceId,
                label: device.label || `Output ${outputDevices.length + 1}`,
              });
            }
          });

          this.availableInputDevices = inputDevices;
          this.availableOutputDevices = outputDevices;
          return { inputDevices, outputDevices };
        }

        buildAudioConstraints(requestedDeviceId) {
          const useEchoCancellation = this.settings.echoCancellation !== false;
          const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          const useNoiseSuppression = normalizedNoiseMode === "standard";
          const constraints = {
            echoCancellation: useEchoCancellation,
            noiseSuppression: useNoiseSuppression,
            autoGainControl: true,
            latency: 0,
            channelCount: 1,
            sampleRate: 48000,
          };

          if (requestedDeviceId && requestedDeviceId !== "default") {
            constraints.deviceId = { exact: requestedDeviceId };
          }

          return constraints;
        }

        async setupVadEngine() {
          this.destroyVadEngine();

          const vadApi = window.vad || window.import_vad;
          const AudioNodeVAD = vadApi?.AudioNodeVAD;
          const MicVAD = vadApi?.MicVAD;
          if (
            (!AudioNodeVAD || typeof AudioNodeVAD.new !== "function")
            && (!MicVAD || typeof MicVAD.new !== "function")
          ) {
            console.warn("Érvénytelen chunk érkezett, kihagyva.");
            this.vadSpeaking = true;
            this.updateTransmissionState({ force: true });
            return;
          }

          try {
            const vadAssetVersion = "20260302-1";
            const vadAssetBaseUrl = new URL("js/libs/vad/", window.location.href);
            const resolveVadAssetUrl = (assetName) => {
              const assetUrl = new URL(assetName, vadAssetBaseUrl);
              assetUrl.searchParams.set("v", vadAssetVersion);
              return assetUrl.toString();
            };

            if (window.ort?.env?.wasm) {
              window.ort.env.wasm.wasmPaths = vadAssetBaseUrl.toString();
              window.ort.env.wasm.numThreads = 1;
            }
            if (window.ort?.env) {
              window.ort.env.logLevel = "fatal";
            }

            const preferredDeviceId = String(this.settings.inputDeviceId || "default");
            const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
            const initVadThreshold = this.getVadProbabilityThreshold(normalizedNoiseMode);
            const vadOptions = {
              positiveSpeechThreshold: clamp(initVadThreshold - 0.04, 0.36, 0.72),
              negativeSpeechThreshold: clamp(initVadThreshold - 0.18, 0.22, 0.58),
              minSpeechFrames: 2,
              preSpeechPadFrames: 6,
              onFrameProcessed: (probs) => {
                const now = performance.now();
                this.vadFrameTimestamp = now;
                const speechProb = clamp(Number(probs?.isSpeech) || 0, 0, 1);
                this.vadLastSpeechProbability = speechProb;
                this.vadSpeechProbabilityEma = clamp(
                  (this.vadSpeechProbabilityEma * 0.75) + (speechProb * 0.25),
                  0,
                  1,
                );
                if (speechProb >= 0.56) {
                  this.lastVadSpeechAt = now;
                }
              },
              onSpeechStart: () => {
                this.lastVadSpeechAt = performance.now();
                this.vadSpeaking = true;
                this.updateTransmissionState({ force: true });
              },
              onSpeechEnd: () => {
                this.vadSpeaking = false;
                this.updateTransmissionState({ force: true });
              },
              modelURL: resolveVadAssetUrl("silero_vad.onnx"),
              workletURL: resolveVadAssetUrl("vad.worklet.bundle.min.js"),
            };

            if (
              AudioNodeVAD
              && typeof AudioNodeVAD.new === "function"
              && this.audioContext
              && this.sourceNode
            ) {
              this.myVad = await AudioNodeVAD.new(this.audioContext, vadOptions);
              if (this.myVad && typeof this.myVad.receive === "function") {
                const vadInputNode = this.levelAnalyserNode
                  || this.transientCompressorNode
                  || this.sourceNode;
                this.myVad.receive(vadInputNode);
              }
            } else if (MicVAD && typeof MicVAD.new === "function") {
              this.myVad = await MicVAD.new({
                stream: this.rawStream,
                additionalAudioConstraints: preferredDeviceId && preferredDeviceId !== "default"
                  ? { deviceId: { exact: preferredDeviceId } }
                  : {},
                ...vadOptions,
              });
            } else {
              throw new Error("Nem sikerült képeket visszakapni.");
            }

            this.vadSpeaking = false;
            this.vadFrameTimestamp = performance.now();
            this.vadLastSpeechProbability = 0;
            this.vadSpeechProbabilityEma = 0;
            if (typeof this.myVad.start === "function") {
              this.myVad.start();
            }
          } catch (error) {
            console.warn("Discord 2 Silero VAD init error:", error);
            this.myVad = null;
            this.vadSpeaking = false;
            this.vadFrameTimestamp = 0;
            this.vadLastSpeechProbability = 0;
            this.vadSpeechProbabilityEma = 0;
            this.lastVadSpeechAt = 0;
          }

          this.updateTransmissionState({ force: true });
        }

        destroyVadEngine() {
          const activeVad = this.myVad;
          this.myVad = null;
          this.vadSpeaking = false;
          this.vadFrameTimestamp = 0;
          this.vadLastSpeechProbability = 0;
          this.vadSpeechProbabilityEma = 0;
          this.lastVadSpeechAt = 0;
          if (!activeVad) {
            return;
          }

          try {
            if (typeof activeVad.pause === "function") {
              activeVad.pause();
            }
          } catch (_error) {}

          try {
            this.safeDisconnectNode(activeVad.entryNode);
          } catch (_error) {}

          try {
            if (typeof activeVad.destroy === "function") {
              activeVad.destroy();
            }
          } catch (_error) {}
        }

        async startLocalStream(deviceId = null) {
          const requestedDeviceId = String(deviceId || this.settings.inputDeviceId || "default");
          let stream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: this.buildAudioConstraints(requestedDeviceId),
              video: false,
            });
          } catch (error) {
            if (error.name === "NotFoundError" && requestedDeviceId !== "default") {
              console.warn(`Discord 2 mikrofon nem található (${requestedDeviceId}), visszatérés az alapértelmezettre.`);
              this.settings.inputDeviceId = "default";
              persistDiscord2PersonalSettings();
              stream = await navigator.mediaDevices.getUserMedia({
                audio: this.buildAudioConstraints("default"),
                video: false,
              });
            } else {
              throw error;
            }
          }

          this.destroyVadEngine();
          this.stopTracks(this.rawStream);
          this.rawStream = stream;

          await this.setupAudioGraph(stream);
          await this.setupVadEngine();

          this.currentLevel = 0;

          const activeTrack = stream.getAudioTracks()[0] || null;
          const trackSettings = activeTrack?.getSettings?.() || {};
          const activeDeviceId = String(trackSettings.deviceId || requestedDeviceId || "default");
          const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);

          this.settings.inputDeviceId = activeDeviceId || "default";
          this.activeInputDeviceId = activeDeviceId || "default";
          this.activeRequestedDeviceId = requestedDeviceId;
          this.activeNoiseSuppressionMode = normalizedNoiseMode;
          this.activeEchoCancellation = this.settings.echoCancellation !== false;

          this.setMicVolume(this.settings.micVolume);
          this.setOutputVolume(this.settings.outputVolume);
          this.applyProcessingProfile();
          this.updateTransmissionState({ force: true });
          this.onStreamReady(this.transmitStream);

          return this.transmitStream;
        }

        async restartLocalStream() {
          return this.startLocalStream(this.settings.inputDeviceId);
        }

        async applyRealtimeInputConstraints() {
          const rawTrack = this.rawStream?.getAudioTracks?.()[0] || null;
          if (!rawTrack || typeof rawTrack.applyConstraints !== "function") {
            return false;
          }

          const useEchoCancellation = this.settings.echoCancellation !== false;
          const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          const useNoiseSuppression = normalizedNoiseMode === "standard";

          try {
            await rawTrack.applyConstraints({
              echoCancellation: useEchoCancellation,
              noiseSuppression: useNoiseSuppression,
              autoGainControl: true,
              latency: 0,
              channelCount: 1,
              sampleRate: 48000,
            });
            this.activeNoiseSuppressionMode = normalizedNoiseMode;
            this.activeEchoCancellation = useEchoCancellation;
            return true;
          } catch (error) {
            console.warn("Discord 2 realtime audio constraint error:", error);
            return false;
          }
        }

        shouldRestartLocalStream() {
          if (!this.rawStream || !this.transmitStream || !this.transmitTrack) {
            return true;
          }
          if (this.transmitTrack.readyState !== "live") {
            return true;
          }

          const requestedDeviceId = String(this.settings.inputDeviceId || "default");
          if (this.activeRequestedDeviceId !== requestedDeviceId) {
            return true;
          }
          if (
            requestedDeviceId !== "default"
            && this.activeInputDeviceId
            && this.activeInputDeviceId !== requestedDeviceId
          ) {
            return true;
          }

          return false;
        }

        stopLocalStream() {
          this.stopMicTest();
          this.destroyVadEngine();
          this.stopTracks(this.rawStream);
          this.rawStream = null;
          this.activeInputDeviceId = null;
          this.activeRequestedDeviceId = null;
          this.activeNoiseSuppressionMode = null;
          this.activeEchoCancellation = null;
          this.currentLevel = 0;
          this.currentRms = 0;
          this.speakingReleaseAt = 0;
          this.levelSpeaking = false;
          this.levelSpeakingReleaseAt = 0;
          this.noiseFloor = 0.04;
          this.keyboardNoiseScore = 0;
          this.keyboardNoiseLikely = false;
          this.keyboardNoiseDetectedAt = 0;
          this.teardownAudioGraph();
          this.setSpeakingState(false);
          this.emitLevelUpdate();
        }

        stopTracks(stream) {
          if (!stream) {
            return;
          }
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (_error) {}
          });
        }

        async setupAudioGraph(stream) {
          this.teardownAudioGraph();

          const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextCtor) {
            throw new Error("Browser does not support AudioContext API.");
          }

          if (!this.audioContext || this.audioContext.state === "closed") {
            this.audioContext = new AudioContextCtor({
              latencyHint: "interactive",
              sampleRate: 48000,
            });
          }

          this.sourceNode = this.audioContext.createMediaStreamSource(stream);
          this.inputGainNode = this.audioContext.createGain();
          this.highpassNode = this.audioContext.createBiquadFilter();
          this.lowpassNode = this.audioContext.createBiquadFilter();
          this.transientCompressorNode = this.audioContext.createDynamicsCompressor();
          this.levelAnalyserNode = this.audioContext.createAnalyser();
          this.noiseDuckNode = this.audioContext.createGain();
          this.transmitGateNode = this.audioContext.createGain();
          this.destinationNode = this.audioContext.createMediaStreamDestination();

          this.highpassNode.type = "highpass";
          this.highpassNode.frequency.value = 110;
          this.highpassNode.Q.value = 0.707;
          this.lowpassNode.type = "lowpass";
          this.lowpassNode.frequency.value = 6500;
          this.lowpassNode.Q.value = 0.75;

          this.transientCompressorNode.threshold.value = -38;
          this.transientCompressorNode.knee.value = 6;
          this.transientCompressorNode.ratio.value = 10;
          this.transientCompressorNode.attack.value = 0.003;
          this.transientCompressorNode.release.value = 0.1;

          this.levelAnalyserNode.fftSize = 2048;
          this.levelAnalyserNode.smoothingTimeConstant = 0.18;
          this.levelSampleBuffer = new Float32Array(this.levelAnalyserNode.fftSize);
          this.frequencySampleBuffer = new Uint8Array(this.levelAnalyserNode.frequencyBinCount);

          this.noiseFloor = 0.04;
          this.levelSpeaking = false;
          this.levelSpeakingReleaseAt = 0;
          this.keyboardNoiseScore = 0;
          this.keyboardNoiseLikely = false;
          this.keyboardNoiseDetectedAt = 0;
          this.noiseDuckNode.gain.value = 1;
          this.transmitGateNode.gain.value = 0;

          if (normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression) === "krisp") {
            await this.ensureRnnoiseWorkletNode();
          }

          this.applyProcessingProfile();
          this.startLevelMonitoring();

          this.transmitStream = this.destinationNode.stream;
          this.transmitTrack = this.transmitStream.getAudioTracks()[0] || null;

          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume().catch(() => {});
          }
        }

        safeDisconnectNode(node) {
          if (!node || typeof node.disconnect !== "function") {
            return;
          }
          try {
            node.disconnect();
          } catch (_error) {}
        }

        async ensureRnnoiseWorkletNode() {
          if (!this.audioContext) {
            return null;
          }
          if (typeof AudioWorkletNode === "undefined" || !window.DeepFilter) {
            return null;
          }
          if (this.rnnoiseWorkletNode) {
            return this.rnnoiseWorkletNode;
          }

          try {
            if (!this.deepFilterCore) {
              this.deepFilterCore = new window.DeepFilter.DeepFilterNet3Core({
                sampleRate: this.audioContext.sampleRate,
                noiseReductionLevel: 100, // Erőteljes szűrés a tiszta hangzásért
                assetConfig: {
                  cdnUrl: "/js/libs/deepfilter"
                }
              });
              await this.deepFilterCore.initialize();
            }

            const node = await this.deepFilterCore.createAudioWorkletNode(this.audioContext);
            this.rnnoiseWorkletNode = node;
            this.rnnoiseAvailable = true;
            this.rnnoiseLastError = null;
            return node;
          } catch (error) {
            this.rnnoiseAvailable = false;
            this.rnnoiseLastError = String(error?.message || error || "DeepFilter unavailable");
            console.warn("Discord 2 DeepFilter worklet init error:", error);
            return null;
          }
        }

        startLevelMonitoring() {
          this.stopLevelMonitoring();
          if (!this.levelAnalyserNode || !this.levelSampleBuffer || !this.frequencySampleBuffer) {
            return;
          }

          const sampleLevel = () => {
            if (!this.levelAnalyserNode || !this.levelSampleBuffer || !this.frequencySampleBuffer) {
              return;
            }
            this.levelAnalyserNode.getFloatTimeDomainData(this.levelSampleBuffer);
            this.levelAnalyserNode.getByteFrequencyData(this.frequencySampleBuffer);
            this.handleLevelSamples(this.levelSampleBuffer, this.frequencySampleBuffer);
          };

          sampleLevel();
          this.levelMonitorTimer = setInterval(sampleLevel, this.levelMonitorIntervalMs);
        }

        stopLevelMonitoring() {
          if (!this.levelMonitorTimer) {
            return;
          }
          clearInterval(this.levelMonitorTimer);
          this.levelMonitorTimer = null;
        }

        teardownAudioGraph() {
          this.stopLevelMonitoring();

          if (this.rnnoiseWorkletNode?.port) {
            try {
              this.rnnoiseWorkletNode.port.postMessage({ type: "dispose" });
            } catch (_error) {}
          }

          [
            this.sourceNode,
            this.inputGainNode,
            this.highpassNode,
            this.lowpassNode,
            this.rnnoiseWorkletNode,
            this.transientCompressorNode,
            this.levelAnalyserNode,
            this.noiseDuckNode,
            this.transmitGateNode,
            this.destinationNode,
          ].forEach((node) => {
            this.safeDisconnectNode(node);
          });

          this.sourceNode = null;
          this.inputGainNode = null;
          this.highpassNode = null;
          this.lowpassNode = null;
          this.rnnoiseWorkletNode = null;
          this.rnnoiseAvailable = false;
          this.transientCompressorNode = null;
          this.levelAnalyserNode = null;
          this.noiseDuckNode = null;
          this.transmitGateNode = null;
          this.destinationNode = null;
          this.levelSampleBuffer = null;
          this.frequencySampleBuffer = null;
          this.keyboardNoiseScore = 0;
          this.keyboardNoiseLikely = false;
          this.keyboardNoiseDetectedAt = 0;
          this.transmitStream = null;
          this.transmitTrack = null;
        }

        applyProcessingProfile() {
          if (
            !this.audioContext
            || !this.sourceNode
            || !this.inputGainNode
            || !this.highpassNode
            || !this.lowpassNode
            || !this.transientCompressorNode
            || !this.levelAnalyserNode
            || !this.noiseDuckNode
            || !this.transmitGateNode
            || !this.destinationNode
          ) {
            return;
          }

          this.safeDisconnectNode(this.sourceNode);
          this.safeDisconnectNode(this.inputGainNode);
          this.safeDisconnectNode(this.highpassNode);
          this.safeDisconnectNode(this.lowpassNode);
          this.safeDisconnectNode(this.rnnoiseWorkletNode);
          this.safeDisconnectNode(this.transientCompressorNode);
          this.safeDisconnectNode(this.levelAnalyserNode);
          this.safeDisconnectNode(this.noiseDuckNode);
          this.safeDisconnectNode(this.transmitGateNode);

          const noiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          if (noiseMode === "krisp" && !this.rnnoiseWorkletNode) {
            void this.ensureRnnoiseWorkletNode().then((node) => {
              if (node) {
                this.applyProcessingProfile();
              }
            });
          }
          if (noiseMode === "krisp") {
            this.transientCompressorNode.threshold.value = -30;
            this.transientCompressorNode.knee.value = 8;
            this.transientCompressorNode.ratio.value = 6;
            this.transientCompressorNode.attack.value = 0.005;
            this.transientCompressorNode.release.value = 0.15;
            this.highpassNode.frequency.value = 80;
            this.lowpassNode.frequency.value = 14000;
          } else if (noiseMode === "standard") {
            this.transientCompressorNode.threshold.value = -36;
            this.transientCompressorNode.knee.value = 6;
            this.transientCompressorNode.ratio.value = 8;
            this.transientCompressorNode.attack.value = 0.004;
            this.transientCompressorNode.release.value = 0.12;
            this.highpassNode.frequency.value = 110;
            this.lowpassNode.frequency.value = 5600;
          } else {
            this.transientCompressorNode.threshold.value = -28;
            this.transientCompressorNode.knee.value = 9;
            this.transientCompressorNode.ratio.value = 3;
            this.transientCompressorNode.attack.value = 0.006;
            this.transientCompressorNode.release.value = 0.16;
            this.highpassNode.frequency.value = 95;
            this.lowpassNode.frequency.value = 7800;
          }

          this.sourceNode.connect(this.inputGainNode);
          this.inputGainNode.connect(this.highpassNode);

          let processingNode = this.highpassNode;
          if (noiseMode === "krisp" && this.rnnoiseWorkletNode) {
            processingNode.connect(this.rnnoiseWorkletNode);
            processingNode = this.rnnoiseWorkletNode;
          }

          processingNode.connect(this.transientCompressorNode);
          this.transientCompressorNode.connect(this.lowpassNode);
          this.lowpassNode.connect(this.levelAnalyserNode);
          this.levelAnalyserNode.connect(this.noiseDuckNode);
          this.noiseDuckNode.connect(this.transmitGateNode);
          this.transmitGateNode.connect(this.destinationNode);

          this.setMicVolume(this.settings.micVolume);
          this.updateTransmissionState({ force: true });
        }

        handleAudioProcess(event) {
          const channelData = event?.inputBuffer?.getChannelData?.(0);
          this.handleLevelSamples(channelData, null);
        }

        setNoiseDuckLevel(targetGain = 1) {
          if (!this.noiseDuckNode || !this.audioContext) {
            return;
          }
          const normalizedGain = clamp(Number(targetGain) || 0, 0.02, 1);
          this.noiseDuckNode.gain.setTargetAtTime(
            normalizedGain,
            this.audioContext.currentTime,
            0.022,
          );
        }

        computeSpectralRatios(frequencyData) {
          if (
            !frequencyData
            || !frequencyData.length
            || !this.audioContext
            || !this.levelAnalyserNode
          ) {
            return { hfRatio: 0, midRatio: 0 };
          }

          const sampleRate = Number(this.audioContext.sampleRate) || 48000;
          const fftSize = Number(this.levelAnalyserNode.fftSize) || 1024;
          const binHz = sampleRate / fftSize;
          if (!Number.isFinite(binHz) || binHz <= 0) {
            return { hfRatio: 0, midRatio: 0 };
          }

          const hfStartIndex = Math.max(1, Math.floor(1800 / binHz));
          const midStartIndex = Math.max(1, Math.floor(180 / binHz));

          let totalEnergy = 0;
          let hfEnergy = 0;
          let midEnergy = 0;
          for (let index = 1; index < frequencyData.length; index += 1) {
            const amplitude = (frequencyData[index] || 0) / 255;
            const energy = amplitude * amplitude;
            totalEnergy += energy;
            if (index >= hfStartIndex) {
              hfEnergy += energy;
            } else if (index >= midStartIndex) {
              midEnergy += energy;
            }
          }

          if (totalEnergy <= 0) {
            return { hfRatio: 0, midRatio: 0 };
          }

          return {
            hfRatio: clamp(hfEnergy / totalEnergy, 0, 1),
            midRatio: clamp(midEnergy / totalEnergy, 0, 1),
          };
        }

        handleLevelSamples(channelData, frequencyData = null) {
          if (!channelData || !channelData.length) {
            return;
          }

          let sumSquares = 0;
          let peak = 0;
          let zeroCrossings = 0;
          let previous = channelData[0] || 0;
          for (let index = 0; index < channelData.length; index += 1) {
            const sample = channelData[index];
            sumSquares += sample * sample;
            const abs = Math.abs(sample);
            if (abs > peak) {
              peak = abs;
            }
            if ((sample >= 0 && previous < 0) || (sample < 0 && previous >= 0)) {
              zeroCrossings += 1;
            }
            previous = sample;
          }

          const rms = Math.sqrt(sumSquares / channelData.length);
          this.currentRms = clamp(rms, 0, 1);
          const rmsDb = 20 * Math.log10(this.currentRms + 1e-6);
          const normalizedLevel = clamp((rmsDb + 100) / 100, 0, 1);
          this.currentLevel = clamp((this.currentLevel * 0.3) + (normalizedLevel * 0.7), 0, 1);
          const zeroCrossRate = zeroCrossings / channelData.length;
          const crestFactor = peak / (rms + 1e-5);

          const now = performance.now();
          if (!this.levelSpeaking && !this.vadSpeaking) {
            this.noiseFloor = clamp((this.noiseFloor * 0.985) + (this.currentLevel * 0.015), 0.005, 0.6);
          }
          if (this.settings.inputSensitivityAuto) {
            const baseline = clamp(this.noiseFloor, 0.005, 0.6);
            this.autoThreshold = clamp(Math.max(baseline + 0.06, baseline * 1.45), 0.03, 0.86);
          }

          const threshold = this.getEffectiveThreshold();
          const attackThreshold = clamp(
            threshold + (this.settings.inputSensitivityAuto ? 0.02 : 0.012),
            0.02,
            0.96,
          );
          const releaseThreshold = clamp(attackThreshold - 0.035, 0.01, 0.92);
          if (this.currentLevel >= attackThreshold) {
            this.levelSpeaking = true;
            this.levelSpeakingReleaseAt = now + 240;
          } else if (this.levelSpeaking) {
            if (this.currentLevel >= releaseThreshold) {
              this.levelSpeakingReleaseAt = now + 200;
            } else if (now >= this.levelSpeakingReleaseAt) {
              this.levelSpeaking = false;
            }
          }

          const { hfRatio, midRatio } = this.computeSpectralRatios(frequencyData);
          const noiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          const speechConfidence = Math.max(
            clamp(this.vadLastSpeechProbability, 0, 1),
            clamp(this.vadSpeechProbabilityEma, 0, 1),
          );
          const hasSpeechEnergy = this.vadSpeaking
            || this.vadLastSpeechProbability >= 0.58
            || this.vadSpeechProbabilityEma >= 0.54
            || midRatio >= 0.28
            || (this.levelSpeaking && this.currentLevel >= (threshold + 0.02));
          const transientComponent = clamp((crestFactor - (hasSpeechEnergy ? 3.8 : 3.2)) / 4.8, 0, 1);
          const highFreqComponent = clamp((hfRatio - (hasSpeechEnergy ? 0.36 : 0.3)) / 0.5, 0, 1);
          const zcrComponent = clamp((zeroCrossRate - 0.08) / 0.24, 0, 1);
          const transientScore = clamp(
            (transientComponent * 0.49) + (highFreqComponent * 0.39) + (zcrComponent * 0.12),
            0,
            1,
          );
          const keyboardBurstThreshold = speechConfidence >= 0.7
            ? 0.68
            : (hasSpeechEnergy ? 0.56 : 0.42);
          const likelyKeyboardBurst = transientScore >= keyboardBurstThreshold
            && this.currentLevel >= Math.max(threshold - 0.08, 0.06);

          if (likelyKeyboardBurst) {
            this.keyboardNoiseDetectedAt = now;
            this.keyboardNoiseScore = clamp(
              this.keyboardNoiseScore + (
                speechConfidence >= 0.7
                  ? 0.05
                  : (hasSpeechEnergy ? 0.1 : 0.2)
              ),
              0,
              1,
            );
          } else {
            this.keyboardNoiseScore = clamp(
              this.keyboardNoiseScore - (hasSpeechEnergy ? 0.03 : 0.09),
              0,
              1,
            );
          }

          const keyboardHoldMs = hasSpeechEnergy ? 170 : 260;
          const keyboardIsRecent = this.keyboardNoiseDetectedAt > 0
            && (now - this.keyboardNoiseDetectedAt) <= keyboardHoldMs;
          this.keyboardNoiseLikely = this.keyboardNoiseScore >= (hasSpeechEnergy ? 0.42 : 0.3)
            || keyboardIsRecent;
          if (
            hasSpeechEnergy
            && speechConfidence < 0.4
            && this.currentLevel >= Math.max(threshold + 0.16, 0.22)
          ) {
            this.keyboardNoiseLikely = false;
          }

          if (noiseMode === "krisp") {
            let duckGain = 1;
            if (this.keyboardNoiseLikely) {
              if (hasSpeechEnergy && speechConfidence >= 0.82) {
                duckGain = clamp(0.48 - (this.keyboardNoiseScore * 0.16), 0.24, 0.62);
              } else if (hasSpeechEnergy) {
                duckGain = clamp(0.14 - (this.keyboardNoiseScore * 0.09), 0.04, 0.22);
              } else {
                duckGain = 0.015;
              }
            } else if (this.keyboardNoiseScore > 0.08) {
              duckGain = clamp(1 - (this.keyboardNoiseScore * 0.35), 0.78, 1);
            }
            this.setNoiseDuckLevel(duckGain);
          } else if (noiseMode === "standard") {
            this.setNoiseDuckLevel(this.keyboardNoiseLikely && !hasSpeechEnergy ? 0.65 : 1);
          } else {
            this.setNoiseDuckLevel(1);
          }

          this.emitLevelUpdate();
          this.updateTransmissionState();
        }

        mapSensitivityToThreshold(sensitivity) {
          const normalized = clamp(Number(sensitivity) || 0, 0, 100) / 100;
          const curved = Math.pow(normalized, 1.05);
          return clamp(curved, 0.005, 0.96);
        }

        getVadProbabilityThreshold(noiseMode = "standard") {
          const normalizedMode = normalizeDiscord2NoiseSuppressionMode(noiseMode);
          const sensitivityNorm = clamp(Number(this.settings.inputSensitivity) || 0, 0, 100) / 100;
          let threshold = this.settings.inputSensitivityAuto
            ? clamp(0.38 + (this.noiseFloor * 0.22), 0.28, 0.6)
            : (0.26 + (sensitivityNorm * 0.42));
          if (normalizedMode === "krisp") {
            threshold += 0.015;
          }
          return clamp(threshold, 0.22, 0.76);
        }

        getEffectiveThreshold() {
          if (this.settings.inputSensitivityAuto) {
            return clamp(this.autoThreshold, 0.02, 0.9);
          }
          return clamp(this.manualThreshold, 0.005, 0.96);
        }

        emitLevelUpdate() {
          this.onLevelChange(
            this.currentLevel,
            this.getEffectiveThreshold(),
            this.currentRms,
            { keyboardNoiseLikely: this.keyboardNoiseLikely === true },
          );
        }

        setMicVolume(value) {
          const volumePercent = clamp(Number(value) || 0, 0, 200);
          if (this.inputGainNode && this.audioContext) {
            const gainValue = volumePercent / 100;
            this.inputGainNode.gain.setTargetAtTime(gainValue, this.audioContext.currentTime, 0.015);
          }
        }

        setOutputVolume(value) {
          const volumePercent = clamp(Number(value) || 0, 0, 200);
          if (this.micTestAudio) {
            this.micTestAudio.volume = clamp(volumePercent / 100, 0, 1);
          }
        }

        setTransmitGateState(open) {
          if (!this.transmitGateNode || !this.audioContext) {
            return;
          }
          const gateTarget = open === true ? 1 : 0.0001;
          const timeConstant = open === true ? 0.008 : 0.055;
          this.transmitGateNode.gain.setTargetAtTime(gateTarget, this.audioContext.currentTime, timeConstant);
        }

        setMuteState({ muted, deafened } = {}) {
          this.muted = muted === true;
          this.deafened = deafened === true;
          this.updateTransmissionState({ force: true });
        }

        setPushToTalkPressed(pressed) {
          this.pushToTalkPressed = pressed === true;
          this.updateTransmissionState({ force: true });
        }

        getShouldTransmit() {
          if (!this.transmitTrack) {
            return false;
          }
          if (this.muted || this.deafened) {
            return false;
          }
          if (this.settings.inputMode === "ptt") {
            return this.pushToTalkPressed;
          }

          const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          const now = performance.now();
          const hasVadInstance = Boolean(this.myVad);
          const hasFreshVadFrames = this.vadFrameTimestamp > 0 && (now - this.vadFrameTimestamp) <= 2400;
          const recentVadSpeech = this.lastVadSpeechAt > 0 && (now - this.lastVadSpeechAt) <= 360;
          const vadProbabilityThreshold = this.getVadProbabilityThreshold(normalizedNoiseMode);
          const speechConfidence = Math.max(
            clamp(this.vadLastSpeechProbability, 0, 1),
            clamp(this.vadSpeechProbabilityEma, 0, 1),
          );
          const vadProbabilitySpeaking = hasFreshVadFrames && this.vadLastSpeechProbability >= vadProbabilityThreshold;
          const vadEmaSpeaking = hasFreshVadFrames
            && this.vadSpeechProbabilityEma >= Math.max(vadProbabilityThreshold - 0.06, 0.28);
          const strongVadSpeech = hasFreshVadFrames
            && (
              this.vadLastSpeechProbability >= Math.min(0.92, vadProbabilityThreshold + 0.2)
              || this.vadSpeechProbabilityEma >= Math.min(0.84, vadProbabilityThreshold + 0.12)
            );
          const levelThreshold = this.getEffectiveThreshold();
          const rmsAssistSpeaking = this.levelSpeaking
            && this.currentLevel >= Math.max(levelThreshold - 0.02, 0.04);

          let speakingCandidate = false;
          if (hasFreshVadFrames) {
            speakingCandidate = (
              this.vadSpeaking === true
              || recentVadSpeech
              || vadProbabilitySpeaking
              || vadEmaSpeaking
              || rmsAssistSpeaking
              || this.currentLevel >= Math.max(levelThreshold + 0.015, 0.07)
            );
          } else if (hasVadInstance) {
            speakingCandidate = rmsAssistSpeaking
              && this.currentLevel >= Math.max(levelThreshold - 0.02, 0.045);
          } else {
            speakingCandidate = this.levelSpeaking === true
              || this.currentLevel >= Math.max(levelThreshold, 0.07);
          }

          if (!speakingCandidate && this.speaking && now < this.speakingReleaseAt) {
            speakingCandidate = true;
          }
          if (speakingCandidate) {
            this.speakingReleaseAt = now + 220;
          }

          if (normalizedNoiseMode === "krisp" && this.keyboardNoiseLikely && !strongVadSpeech) {
            const isClearlyAboveThreshold = this.currentLevel >= Math.max(levelThreshold + 0.02, 0.08);
            const hasVadSupport = (
              this.vadSpeaking
              || this.vadLastSpeechProbability >= (vadProbabilityThreshold - 0.03)
              || this.vadSpeechProbabilityEma >= (vadProbabilityThreshold - 0.06)
            );
            if (!isClearlyAboveThreshold && !hasVadSupport && speechConfidence < 0.62) {
              return false;
            }
          }

          return speakingCandidate;
        }

        updateTransmissionState({ force = false } = {}) {
          const shouldTransmit = this.getShouldTransmit();
          const allowTrack = !(this.muted || this.deafened);

          if (this.transmitTrack) {
            this.transmitTrack.enabled = allowTrack;
          }

          this.setTransmitGateState(allowTrack && shouldTransmit);

          const speakingNow = allowTrack && shouldTransmit;
          if (force || speakingNow !== this.speaking) {
            this.setSpeakingState(speakingNow);
          }
        }

        setSpeakingState(nextSpeaking) {
          const speaking = nextSpeaking === true;
          if (this.speaking === speaking) {
            return;
          }
          this.speaking = speaking;
          this.onSpeakingChange(speaking);
        }

        async setOutputDevice(deviceId) {
          this.outputDeviceId = String(deviceId || "default");
          if (this.micTestAudio) {
            await this.applySinkId(this.micTestAudio);
          }
        }

        async applySinkId(audioElement) {
          if (!audioElement || typeof audioElement.setSinkId !== "function") {
            return false;
          }
          try {
            const targetSinkId = this.outputDeviceId && this.outputDeviceId !== "default"
              ? this.outputDeviceId
              : "";
            await audioElement.setSinkId(targetSinkId);
            return true;
          } catch (error) {
            console.warn("Discord 2 output sink error:", error);
            return false;
          }
        }

        async startMicTest() {
          if (!this.rawStream) {
            await this.startLocalStream(this.settings.inputDeviceId);
          }

          if (!this.micTestAudio) {
            this.micTestAudio = document.createElement("audio");
            this.micTestAudio.autoplay = true;
            this.micTestAudio.playsInline = true;
            this.micTestAudio.style.display = "none";
            document.body.appendChild(this.micTestAudio);
          }

          this.micTestAudio.srcObject = this.rawStream;
          this.micTestAudio.volume = clamp((this.settings.outputVolume || 100) / 100, 0, 1);
          await this.applySinkId(this.micTestAudio);
          await this.micTestAudio.play();
          this.micTestActive = true;
        }

        stopMicTest() {
          if (!this.micTestAudio) {
            this.micTestActive = false;
            return;
          }

          try {
            this.micTestAudio.pause();
          } catch (_error) {}

          this.micTestAudio.srcObject = null;
          this.micTestActive = false;
        }

        isMicTestActive() {
          return this.micTestActive === true;
        }

        getCurrentLevel() {
          return this.currentLevel;
        }

        getCurrentThreshold() {
          return this.getEffectiveThreshold();
        }

        getTransmitStream() {
          return this.transmitStream;
        }

        dispose() {
          this.stopLocalStream();

          if (this.micTestAudio) {
            try {
              this.micTestAudio.remove();
            } catch (_error) {}
            this.micTestAudio = null;
          }

          if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close().catch(() => {});
          }

          this.audioContext = null;
          this.myVad = null;
        }
      }
