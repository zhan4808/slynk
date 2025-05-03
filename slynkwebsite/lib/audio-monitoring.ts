/**
 * Audio monitoring utility for detecting speech
 * Based on the hark library but simplified for our needs
 */

interface HarkOptions {
  threshold?: number;
  interval?: number;
}

interface HarkInstance {
  speaking: boolean;
  state: 'running' | 'stopped';
  threshold: number;
  interval: number;
  events: Record<string, Function>;
  speakingHistory: number[];
  start: () => HarkInstance;
  stop: () => HarkInstance;
  on: (event: string, callback: Function) => HarkInstance;
  off: (event: string) => HarkInstance;
  looper: () => void;
}

/**
 * Creates an audio monitor that detects when speaking starts/stops
 * 
 * @param stream - The MediaStream to monitor
 * @param options - Configuration options
 * @returns A Hark instance
 */
export const createAudioMonitor = (stream: MediaStream, options: HarkOptions = {}): HarkInstance => {
  // Initialize audio context if needed
  if (!window.audioContext) {
    try {
      window.audioContext = new AudioContext();
    } catch (err) {
      console.error("Error creating audio context:", err);
      throw new Error("Failed to create audio context for audio monitoring");
    }
  }
  
  if (!window.audioContext) {
    throw new Error("Failed to initialize audio context for audio monitoring");
  }
  
  const analyser = window.audioContext.createAnalyser();
  const streamNode = window.audioContext.createMediaStreamSource(stream);
  streamNode.connect(analyser);
  
  const harker: HarkInstance = {
    speaking: false,
    state: 'stopped',
    threshold: options.threshold || -65,
    interval: options.interval || 100,
    events: {},
    speakingHistory: [],
    
    start: function() {
      this.state = 'running';
      this.looper();
      return this;
    },
    
    stop: function() {
      this.state = 'stopped';
      return this;
    },
    
    on: function(event: string, callback: Function) {
      this.events[event] = callback;
      return this;
    },
    
    off: function(event: string) {
      delete this.events[event];
      return this;
    },
    
    looper: function() {
      if (this.state === 'stopped') return;
      
      setTimeout(() => {
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128;
          sumSquares += val * val;
        }
        
        const rms = Math.sqrt(sumSquares / bufferLength);
        const db = 20 * Math.log10(rms);
        
        // Update speaking history
        this.speakingHistory.push(db);
        if (this.speakingHistory.length > 10) {
          this.speakingHistory.shift();
        }
        
        // Get average volume
        const avgDb = this.speakingHistory.reduce((a, b) => a + b, 0) / this.speakingHistory.length;
        
        // Check if speaking
        const speaking = avgDb > this.threshold;
        
        if (speaking && !this.speaking) {
          this.speaking = true;
          if (this.events.speaking) this.events.speaking(stream, avgDb);
        } else if (!speaking && this.speaking) {
          this.speaking = false;
          if (this.events.stopped_speaking) this.events.stopped_speaking(stream, avgDb);
        }
        
        if (this.events.volume_change) this.events.volume_change(avgDb, this.threshold);
        
        this.looper();
      }, this.interval);
    }
  };
  
  return harker.start();
}; 