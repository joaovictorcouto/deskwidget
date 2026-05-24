export function playNotificationSound(volume = 0.8, type = 'sino') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // O ouvido humano percebe o volume de forma logarítmica.
    // Elevar o volume ao quadrado faz o slider parecer mais linear.
    const perceivedVolume = Math.pow(Math.max(0, Math.min(1, volume)), 2);

    if (perceivedVolume <= 0) return;

    // Helper para tocar uma nota genérica
    const playTone = (freq, startTime, duration, typeOsc = 'sine', attack = 0.05) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = typeOsc;
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(perceivedVolume, startTime + attack); // Attack
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay/Release
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
      return osc;
    };

    const now = ctx.currentTime;

    switch (type) {
      case 'sino':
        // C6 -> E6 suave
        playTone(1046.50, now, 0.4);
        playTone(1318.51, now + 0.15, 0.6);
        break;

      case 'suave':
        // Única nota aguda e muito rápida, bem sutil (G6)
        playTone(1567.98, now, 0.3, 'sine', 0.01);
        break;

      case 'bolha':
        // Som de "pop" (frequência cai rápido)
        {
          const osc = playTone(800, now, 0.15, 'sine', 0.01);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        }
        break;

      case 'marimba':
        // Frequência média, ataque rápido, mix com triangle para soar "amadeirado"
        playTone(523.25, now, 0.4, 'sine', 0.01); // C5
        playTone(523.25, now, 0.2, 'triangle', 0.01);
        break;

      case 'duplo':
        // Dois toques curtos (D6)
        playTone(1174.66, now, 0.15, 'sine', 0.01);
        playTone(1174.66, now + 0.15, 0.15, 'sine', 0.01);
        break;

      default:
        // Sino (Fallback)
        playTone(1046.50, now, 0.4);
        playTone(1318.51, now + 0.15, 0.6);
        break;
    }
  } catch (e) {
    console.error("Failed to play notification sound", e);
  }
}
