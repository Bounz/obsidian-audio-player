import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp, App as VueApp } from "vue";
import SidebarAudioPlayer from "./components/SidebarAudioPlayer.vue";

export const AUDIO_PLAYER_VIEW_TYPE = "audio-player-view";

export class AudioPlayerView extends ItemView {
    private vueApp: VueApp | null = null;
    private audioElement: HTMLAudioElement;

    constructor(leaf: WorkspaceLeaf, audioElement: HTMLAudioElement) {
        super(leaf);
        this.audioElement = audioElement;
    }

    getViewType() {
        return AUDIO_PLAYER_VIEW_TYPE;
    }

    getDisplayText() {
        return "Audio Player";
    }

    getIcon() {
        return "headphones";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("audio-player-sidebar-container");

        // Create Vue app mount point
        const vueContainer = container.createDiv();
        
        // Mount Vue component
        this.vueApp = createApp(SidebarAudioPlayer, {
            audio: this.audioElement
        });
        
        this.vueApp.mount(vueContainer);
    }

    async onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
            this.vueApp = null;
        }
    }

    // Method to update current audio file info
    public updateCurrentFile(filepath: string, filename: string, ctx?: any, mdElement?: HTMLElement) {
        // This will be handled through global events in the Vue component
        const event = new CustomEvent('sidebar-audio-update', {
            detail: { filepath, filename, ctx, mdElement }
        });
        document.dispatchEvent(event);
    }
}