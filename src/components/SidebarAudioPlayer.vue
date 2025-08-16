<template>
  <div class="sidebar-audio-player-sb">
    <div v-if="!currentFile" class="no-audio-message-sb">
      <div class="icon-sb">🎵</div>
      <p>No audio file loaded</p>
      <small>Open a note with an audio player to start</small>
    </div>
    
    <div v-else class="audio-content-sb">
      <div class="audio-header-sb">
        <h3 class="file-name-sb">{{ fileName }}</h3>
      </div>

      <div class="main-controls-sb">
        <div class="control-group-sb">
          <div class="playpause-sb seconds-sb" @click="setPlayheadSecs(currentTime-5)">
            -5s
          </div>
		  <div class="playpause-sb" @click="togglePlay" ref="playpause"></div>
          <div class="playpause-sb seconds-sb" @click="setPlayheadSecs(currentTime+5)">
            +5s
          </div>          
        </div>
      </div>

      <div class="waveform-container-sb">
        <div class="waveform-sb">
		  <div class="wv-sb" v-for="(s, i) in filteredData" :key="currentFile+i"				
				@mousedown="barMouseDownHandler(i)">
			<div class="wv-bar-sb" 
				v-bind:class="{'played-sb': i <= currentBar }"
				:style="{
					height: Math.max(4, s * 60) + 'px'
				}">
			</div>
		  </div>          
        </div>
        <div class="timeline-sb">
          <span class="current-time-sb">{{ displayedCurrentTime }}</span>
          <span class="duration-sb">{{ displayedDuration }}</span>
        </div>
      </div>

      <div class="volume-control-sb">
        <span>🔊</span>
        <input type="range" 
               v-model="volume" 
               min="0" 
               max="1" 
               step="0.1"
               @input="updateVolume"
               class="volume-slider-sb">
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { TFile, setIcon } from 'obsidian';
import { secondsToString } from '../utils';

export default defineComponent({
  name: 'SidebarAudioPlayer',
  props: {
    audio: Object as PropType<HTMLAudioElement>
  },
  data() {
    return {
      currentFile: '',
      filepath: '',
      filteredData: [] as number[],
      nSamples: 150,
      duration: 0,
      currentTime: 0,
      playing: false,
      paused: true,
      volume: 0.5,
      updateInterval: null as number | null,
      button: undefined as HTMLSpanElement | undefined,
    }
  },
  computed: {
    displayedCurrentTime() { return secondsToString(this.currentTime); },
    displayedDuration() { return secondsToString(this.duration); },
    currentBar() { return Math.floor(this.currentTime / this.duration * this.nSamples); },
    fileName() { 
      if (!this.filepath) return '';
      return this.filepath.split('/').pop() || '';
    },
  },
  methods: {
    isCurrent() { return this.audio && this.audio.src === this.currentFile; },
    
    async loadFile() {
      if (!this.filepath) return;
      
      // Read file from vault 
      const file = window.app.vault.getAbstractFileByPath(this.filepath) as TFile;

      // Process audio file & set audio el source
      if (file && file instanceof TFile) {
        // Check cached values
        if (!this.loadCache()) {
          await this.processAudio(file.path);
        }
        this.currentFile = window.app.vault.getResourcePath(file);
        
        // Now that currentFile is set, the button will be rendered
        // Set up the button reference and initial icon
        this.$nextTick(() => {
          this.button = this.$refs.playpause as HTMLSpanElement;
          if (this.audio && this.audio.src === this.currentFile) {
            this.setBtnIcon(this.audio.paused ? 'play' : 'pause');
          } else {
            this.setBtnIcon('play');
          }
        });
      }
    },
    
    saveCache() {
      localStorage[`${this.filepath}`] = JSON.stringify(this.filteredData);
      localStorage[`${this.filepath}_duration`] = this.duration;
    },
    
    loadCache(): boolean {
      let cachedData = localStorage[`${this.filepath}`];
      let cachedDuration = localStorage[`${this.filepath}_duration`];

      if (!cachedData) { return false; }
      
      this.filteredData = JSON.parse(cachedData);
      this.duration = Number.parseFloat(cachedDuration)
      return true;
    },
    
    async processAudio(path: string) {
      const arrBuf = await window.app.vault.adapter.readBinary(path);
      const audioContext = new AudioContext();
      const tempArray = [] as number[];

      audioContext.decodeAudioData(arrBuf, (buf) => {
        let rawData = buf.getChannelData(0);
        this.duration = buf.duration;

        const blockSize = Math.floor(rawData.length / this.nSamples);
        for (let i = 0; i < this.nSamples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          tempArray.push(sum / blockSize);
        }
        
        let maxval = Math.max(...tempArray);
        this.filteredData = tempArray.map(x => x / maxval);
        this.saveCache();
      })
    },

    barMouseDownHandler(i: number) {
      let time = i / this.nSamples * this.duration;
      this.setPlayheadSecs(time);
    },

    setPlayheadSecs(time: any) {
      this.currentTime = time;
      if (!this.isCurrent() && this.audio) {
        this.togglePlay();
      }

      if (this.isCurrent() && this.audio) {
        this.audio.currentTime = time;
      }
    },

    togglePlay() {
      if (!this.audio) return;
      
      if (!this.isCurrent()) {
        this.audio.src = this.currentFile;
      }

      if (this.audio.paused) {
        this.globalPause();
        this.play();
      } else {
        this.pause();
      } 
    },

    play() {
      if (!this.audio) return;
      
      if (this.currentTime > 0) {
        this.audio.currentTime = this.currentTime;
      }
      this.audio.addEventListener('timeupdate', this.timeUpdateHandler);
      this.audio.play();
      this.playing = true;
      this.setBtnIcon('pause');
      
      // Dispatch global resume event to sync with inline players
      const ev = new Event('allresume');
      document.dispatchEvent(ev);
    },

    pause() {
      if (!this.audio) return;
      
      this.audio.pause();
      this.playing = false;
      this.setBtnIcon('play');
      
      // Dispatch global pause event to sync with inline players  
      const ev = new Event('allpause');
      document.dispatchEvent(ev);
    },

    globalPause() {
      const ev = new Event('allpause');
      document.dispatchEvent(ev);
    },

    timeUpdateHandler() {
      if (!this.audio) return;
      
      if (this.isCurrent()) {
        this.currentTime = this.audio.currentTime;
      }
    },

    setBtnIcon(icon: string) { 
      if (this.button) {
        setIcon(this.button, icon);
      } else {
        // Try to get the button reference again
        this.button = this.$refs.playpause as HTMLSpanElement;
        if (this.button) {
          setIcon(this.button, icon);
        } else {
		  console.warn('SidebarAudioPlayer: Button ref not available for icon', icon);          
        }
      }
    },


    updateVolume() {
      if (this.audio) {
        this.audio.volume = this.volume;
      }
    },

    updateAudioState() {
      if (this.audio) {
        this.currentTime = this.audio.currentTime;
        this.duration = this.audio.duration || 0;
        this.paused = this.audio.paused;
        this.volume = this.audio.volume;
        this.playing = !this.paused;
      }
    },

    handleSidebarAudioUpdate(event: CustomEvent) {
      const { filepath } = event.detail;
      this.filepath = filepath;
      this.loadFile();
    },

    handleGlobalPause() {
      // Always set to play icon when any audio pauses
      if (this.currentFile && this.button) {
        this.setBtnIcon('play');
      }
      this.updateAudioState();
    },

    handleGlobalResume() {
      // Only set to pause icon if this sidebar is controlling the current audio
      if (this.currentFile && this.button && this.isCurrent()) {
        this.setBtnIcon('pause');
      }
      this.updateAudioState();
    },

  },
  mounted() {
    // Add event listeners
    document.addEventListener('allpause', this.handleGlobalPause);
    document.addEventListener('allresume', this.handleGlobalResume);
    document.addEventListener('sidebar-audio-update', this.handleSidebarAudioUpdate as EventListener);

    if (this.audio) {
      this.audio.addEventListener('ended', () => {
        if (this.audio && this.audio.src === this.currentFile) {
          this.setBtnIcon('play');
        }
      });
    }

    // Set up regular updates
    this.updateInterval = setInterval(this.updateAudioState, 100) as unknown as number;
    
    // Note: Button setup and icon initialization now happens in loadFile()
    // after currentFile is set and the button becomes available in DOM
  },
  
  beforeUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    document.removeEventListener('allpause', this.handleGlobalPause);
    document.removeEventListener('allresume', this.handleGlobalResume);
    document.removeEventListener('sidebar-audio-update', this.handleSidebarAudioUpdate as EventListener);
  }
})

</script>