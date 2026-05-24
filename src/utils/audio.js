export function playNotificationSound(volume = 0.8) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Play a gentle two-tone chime (e.g. C6 then E6)
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.05); // Attack
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Decay/Release
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(1046.50, now, 0.4); // C6
    playTone(1318.51, now + 0.15, 0.6); // E6
    
  } catch (e) {
    console.error("Failed to play notification sound", e);
  }
}
