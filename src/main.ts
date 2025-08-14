import {
	getLinkpath,
	MarkdownPostProcessorContext,
	Notice,
	Plugin,
} from "obsidian";

import { AudioPlayerRenderer } from "./audioPlayerRenderer";
import { AudioPlayerView, AUDIO_PLAYER_VIEW_TYPE } from "./audioPlayerView";

export default class AudioPlayer extends Plugin {
	private player: HTMLAudioElement;

	async onload() {
		this.player = document.createElement("audio");
		this.player.volume = 0.5;
		const body = document.getElementsByTagName("body")[0];
		body.appendChild(this.player);

		// Register the audio player sidebar view
		this.registerView(
			AUDIO_PLAYER_VIEW_TYPE,
			(leaf) => new AudioPlayerView(leaf, this.player)
		);

		// Add ribbon icon to toggle the sidebar
		this.addRibbonIcon("headphones", "Toggle Audio Player", () => {
			this.toggleAudioPlayerView();
		});

		this.addCommand({
			id: "pause-audio",
			name: "Pause Audio",
			callback: () => {
				new Notice("Audio paused");
				const ev = new Event("allpause");
				document.dispatchEvent(ev);
				this.player.pause();
			},
		});

		this.addCommand({
			id: "resume-audio",
			name: "Resume Audio",
			callback: () => {
				new Notice("Audio resumed");
				const ev = new Event("allresume");
				document.dispatchEvent(ev);
				if (this.player.src) this.player.play();
			},
		});

		this.addCommand({
			id: "add-audio-comment",
			name: "Add bookmark",
			callback: () => {
				const ev = new Event("addcomment");
				document.dispatchEvent(ev);
			}
		});

		this.addCommand({
			id: "audio-forward-5s",
			name: "+5 sec",
			callback: () => {
				if (this.player.src) this.player.currentTime += 5;
			}
		});

		this.addCommand({
			id: "audio-back-5s",
			name: "-5 sec",
			callback: () => {
				if (this.player.src) this.player.currentTime -= 5;
			}
		});

		this.addCommand({
			id: "toggle-audio-player",
			name: "Toggle Audio Player Sidebar",
			callback: () => {
				this.toggleAudioPlayerView();
			}
		});

		this.registerMarkdownCodeBlockProcessor(
			"audio-player",
			(
				source: string,
				el: HTMLElement,
				ctx: MarkdownPostProcessorContext
			) => {
				// parse file name
				const re = /\[\[(.+)\]\]/g;
				const filename = re.exec(source)?.at(1);
				if (!filename) return;

				const allowedExtensions = [
					"mp3",
					"wav",
					"ogg",
					"flac",
					"mp4",
					"m4a"
				];
				const link = this.app.metadataCache.getFirstLinkpathDest(
					getLinkpath(filename),
					filename
				);
				if (!link || !allowedExtensions.includes(link.extension))
					return;

				// create root $el
				const container = el.createDiv();
				container.classList.add("base-container");

				//create vue app
				ctx.addChild(
					new AudioPlayerRenderer(el, {
						filepath: link.path,
						ctx,
						player: this.player,
					})
				);

				// Update sidebar view if it exists
				const sidebarView = this.getSidebarView();
				if (sidebarView) {
					sidebarView.updateCurrentFile(link.path, link.name, ctx, el);
				}
			}
		);

		// Register global click handler for timestamp links
		this.registerDomEvent(document, 'click', (event: MouseEvent) => {
			this.handleTimestampClick(event);
		});
	}

	async onunload() {
		// Clean up the sidebar view
		this.app.workspace.detachLeavesOfType(AUDIO_PLAYER_VIEW_TYPE);
	}

	async toggleAudioPlayerView() {
		const existingLeaves = this.app.workspace.getLeavesOfType(AUDIO_PLAYER_VIEW_TYPE);
		
		if (existingLeaves.length > 0) {
			// If view exists, close it
			this.app.workspace.detachLeavesOfType(AUDIO_PLAYER_VIEW_TYPE);
		} else {
			// If view doesn't exist, open it in the right sidebar
			await this.app.workspace.getRightLeaf(false).setViewState({
				type: AUDIO_PLAYER_VIEW_TYPE,
				active: true,
			});

			// Reveal the view
			this.app.workspace.revealLeaf(
				this.app.workspace.getLeavesOfType(AUDIO_PLAYER_VIEW_TYPE)[0]
			);
		}
	}

	private getSidebarView(): AudioPlayerView | null {
		const leaves = this.app.workspace.getLeavesOfType(AUDIO_PLAYER_VIEW_TYPE);
		return leaves.length > 0 ? leaves[0].view as AudioPlayerView : null;
	}

	private handleTimestampClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target) return;

		// Check if clicked element is a link
		const link = target.closest('a[href]') || (target.tagName === 'A' ? target : null) as HTMLAnchorElement;
		if (!link) return;

		// Get the link text and check if it matches a timestamp pattern
		const linkText = link.textContent || '';
		const timestampPattern = /^(\d{1,2}:)?(\d{1,2}):(\d{2})$/;
		
		if (timestampPattern.test(linkText.trim())) {
			event.preventDefault();
			event.stopPropagation();
			
			const timeInSeconds = this.parseTimestamp(linkText.trim());
			console.log('Timestamp link clicked:', linkText, 'parsed to:', timeInSeconds);
			
			// Find the nearest audio player instance
			const audioPlayerElement = this.findNearestAudioPlayer(link as HTMLElement);
			if (audioPlayerElement) {
				this.seekToTimestampInContext(timeInSeconds, audioPlayerElement);
			} else {
				// Fall back to global seeking if no specific player found
				this.seekToTimestamp(timeInSeconds);
			}
		}
	}

	private findNearestAudioPlayer(element: HTMLElement): HTMLElement | null {
		// Look for the nearest audio player container by walking up the DOM
		let current = element.parentElement;
		
		while (current) {
			// Look for audio player UI elements
			const audioPlayer = current.querySelector('.audio-player-ui') as HTMLElement;
			if (audioPlayer) {
				return audioPlayer;
			}
			
			// Look for base-container which is created for each audio player
			if (current.classList.contains('base-container')) {
				const audioPlayer = current.querySelector('.audio-player-ui') as HTMLElement;
				if (audioPlayer) {
					return audioPlayer;
				}
			}
			
			current = current.parentElement;
		}
		
		// If we can't find a specific player, look for any player in the current document
		const audioPlayers = document.querySelectorAll('.audio-player-ui');
		return audioPlayers.length > 0 ? audioPlayers[0] as HTMLElement : null;
	}

	private seekToTimestampInContext(seconds: number, audioPlayerElement: HTMLElement) {
		console.log('seekToTimestampInContext called with:', seconds, audioPlayerElement);
		
		// Dispatch a custom event to the specific audio player to handle the seek
		const seekEvent = new CustomEvent('seek-to-timestamp', {
			detail: { seconds },
			bubbles: true
		});
		
		audioPlayerElement.dispatchEvent(seekEvent);
	}
	
	private parseTimestamp(timestamp: string): number {
		// Split by colons and parse each part
		const parts = timestamp.split(':').map(part => parseInt(part, 10));
		
		let seconds = 0;
		if (parts.length === 2) {
			// MM:SS format
			seconds = parts[0] * 60 + parts[1];
		} else if (parts.length === 3) {
			// H:MM:SS format
			seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
		}
		
		return seconds;
	}
	
	private seekToTimestamp(seconds: number) {
		console.log('seekToTimestamp called with:', seconds);
		console.log('Player state:', this.player ? 'exists' : 'null', this.player?.src || 'no src');
		
		if (this.player && this.player.src) {
			this.player.currentTime = seconds;
			console.log('Set currentTime to:', seconds);
			
			// If audio is not playing, start it
			if (this.player.paused) {
				this.player.play();
				console.log('Started playback');
			}
			
			// Dispatch events to update UI
			const resumeEvent = new Event('allresume');
			document.dispatchEvent(resumeEvent);
			console.log('Dispatched allresume event');
			
			new Notice(`Jumped to ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`);
		} else {
			console.log('Cannot seek - no player or no src');
			new Notice('No audio file is currently loaded');
		}
	}
}
