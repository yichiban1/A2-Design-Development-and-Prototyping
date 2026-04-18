/**

* Between Typings - Core Script

*
* Project Concept:

* I want to explore typing as more than just an input tool, but a form of expression.

* Normally, when we use input methods, all hesitation, pauses, and impulses are erased,

* leaving only the final text. But this project aims to preserve these "processes"—

* The intervals between keystrokes can actually reflect our emotional state.

*
* Main Functions:

* - Color the text according to typing speed (fast = orange, slow = blue, etc.)

* - Deleted text will float away as a "ghost," instead of disappearing completely.

* - Each keystroke has a corresponding sound effect.

* - The entire typing process can be replayed.

*/

// ========================================
// Basic settings
// ========================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const input = document.getElementById('inputLayer');

// Fill the entire screen with the canvas
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    maxWidth = canvas.width - 280;
});

// Dark background
ctx.fillStyle = '#0a0a0f';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// ========================================
// Opening animation and sample demonstration
// ========================================

// Title Fade-in Animation - Simple and Fast
setTimeout(() => document.getElementById('introTitle').classList.add('show'), 300);

// Pre-recorded sample demo data - showcasing the effects of different typing rhythms
const demoStrokes = [
    { key: 'T', interval: 150, state: 'steady', delay: 800 },
    { key: 'y', interval: 120, state: 'steady', delay: 100 },
    { key: 'p', interval: 140, state: 'steady', delay: 100 },
    { key: 'i', interval: 130, state: 'steady', delay: 100 },
    { key: 'n', interval: 160, state: 'steady', delay: 100 },
    { key: 'g', interval: 140, state: 'steady', delay: 100 },
    { key: ' ', interval: 180, state: 'steady', delay: 100 },
    { key: 'i', interval: 450, state: 'hesitate', delay: 400 },
    { key: 's', interval: 520, state: 'hesitate', delay: 500 },
    { key: ' ', interval: 480, state: 'hesitate', delay: 500 },
    { key: 'a', interval: 60, state: 'rush', delay: 200 },
    { key: 'r', interval: 55, state: 'rush', delay: 60 },
    { key: 't', interval: 70, state: 'rush', delay: 60 },
    { key: '.', interval: 80, state: 'rush', delay: 60 },
    { key: '.', interval: 90, state: 'rush', delay: 80 },
    { key: '.', interval: 85, state: 'rush', delay: 80 },
    { key: 'Backspace', interval: 300, state: 'slow', delay: 400 },
    { key: 'Backspace', interval: 280, state: 'slow', delay: 300 },
    { key: 'Backspace', interval: 290, state: 'slow', delay: 300 }
];

// Opening demonstration - plays after the user presses any key to enter the interface.
async function playDemo() {
    // Show watching prompt
    const hint = document.querySelector('.intro-hint');
    if (hint) {
        hint.textContent = 'watching...';
        hint.style.animation = 'none';
    }
    
    // Wait a short while for the user to see the interface changes.
    await new Promise(r => setTimeout(r, 600));
    
    // Play sample typing
    for (const stroke of demoStrokes) {
        await new Promise(r => setTimeout(r, stroke.delay));
        
        // Check if the user has started typing; if so, stop the demonstration.
        if (history.length > 0) break;
        
        // Simulated button effects
        if (stroke.key === 'Backspace') {
            handleDelete();
        } else if (stroke.key !== ' ') {
            handleType(stroke.key, stroke.interval, stroke.state);
        }
        
        // Create ripple effect
        if (stroke.key !== 'Backspace' && stroke.key !== ' ') {
            const pos = { x: curX - 15, y: curY };
            ripples.push(new Ripple(pos.x, pos.y, stroke.state));
        }
    }
}

// The demo plays a playback marker to ensure it only plays once.
let demoPlayed = false;

// ========================================
// Audio settings (Tone.js)
// ========================================

let synth, audioReady = false;

// The audio is initialized on the first key press (the browser requires user interaction before sound can play).
async function initAudio() {
    if (audioReady) return;
    await Tone.start();
    
    // Using a triangle wave produces a softer sound.
    synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 1 }
    }).toDestination();
    synth.volume.value = -12;  // Turn the volume down a bit
    audioReady = true;
}

// ========================================
// Colors and Emotions
// ========================================

// Colors corresponding to four emotions
const COLORS = {
    rush: '#e07b54',      // Impulsive - Warm Orange
    steady: '#d4c97a',    // Smooth - Yellow-green 
    slow: '#7ab89e',      // Slow - Turquoise
    hesitate: '#6b8fb5',  // Hesitation - Blue-gray
    ghost: '#777777'      // Ghost - Gray
};

// The musical note chart (pentatonic scale, which sounds more harmonious).
const NOTES = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5'];

// Judging Emotions Based on Key Press Intervals

// <80ms = Very fast (impulsive), 80-200ms = Normal, 200-400ms = Slow, >400ms = Hesitant
function getEmotion(ms) {
    if (ms < 80) return 'rush';
    if (ms < 200) return 'steady';
    if (ms < 400) return 'slow';
    return 'hesitate';
}

// The faster you type, the higher the pitch.
function getNote(ms) {
    const idx = ms < 80 ? 8 : (ms < 200 ? 5 : (ms < 400 ? 2 : 0));
    return NOTES[idx + Math.floor(Math.random() * 3)];
}

//Text styles corresponding to each emotion
const EMOTION_CONFIG = {
    rush: { size: 34, weight: '700', glow: 18, scale: 1.15, spacing: -4 },
    steady: { size: 28, weight: '500', glow: 10, scale: 1, spacing: 0 },
    slow: { size: 26, weight: '400', glow: 6, scale: 0.95, spacing: 6 },
    hesitate: { size: 20, weight: '300', glow: 0, scale: 0.85, spacing: 10 }
};

// ========================================
// State Management
// ========================================

let chars = [],      // Currently displayed text
    ghosts = [],     // Deleted text (ghost)
    ripples = [],    // Ripple effect
    particles = [];  // Particle effects

let history = [], lastTime = 0, delCount = 0, pauseCount = 0;
let cursorVisible = false;

// Text start position
const startX = 140, startY = 160;
let curX = startX, curY = startY;
const lineHeight = 60, maxWidth = canvas.width - 280;

// ========================================
// Text character class
// ========================================

class TextChar {
    constructor(char, x, y, ms, emotion) {
        this.char = char;
        this.x = x; this.y = y;
        this.baseX = x; this.baseY = y;
        this.color = COLORS[emotion];
        const cfg = EMOTION_CONFIG[emotion];
        
        this.size = cfg.size;
        this.weight = cfg.weight;
        this.glow = cfg.glow;
        
        // Initial state of the entrance animation
        this.opacity = 0;
        this.scale = cfg.scale * 1.3;  // Zoom in a little first
        this.targetScale = cfg.scale;
        this.rotation = (Math.random() - 0.5) * 0.2;
        
        // Breathing animation parameters
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 0.02 + Math.random() * 0.01;
        this.amp = emotion === 'hesitate' ? 3 : 1;  // Floats more when hesitating
        this.breatheAmp = 0.03;
    }

    update(dt) {
        // Fade-in and zoom animation
        this.opacity += (1 - this.opacity) * 0.08;
        this.scale += (this.targetScale - this.scale) * 0.08;
        this.rotation *= 0.92;
        
        // Breathing effect (sine wave floating)
        this.phase += this.speed;
        const fx = Math.sin(this.phase) * this.amp;
        const fy = Math.cos(this.phase * 0.7) * this.amp;
        const breathe = 1 + Math.sin(this.phase * 1.5) * this.breatheAmp;
        
        this.x = this.baseX + fx;
        this.y = this.baseY + fy;
        this.currentScale = this.scale * breathe;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.currentScale, this.currentScale);
        ctx.font = `${this.weight} ${this.size}px "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = this.color;
        ctx.textBaseline = 'middle';
        if (this.glow > 0) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.glow;
        }
        ctx.fillText(this.char, 0, 0);
        ctx.restore();
    }
}

// ========================================
// Ghost character class (deleted text)
// ========================================
// The idea came from the concept that "deleted text disappears like a ghost."
// Implementation: Give the deleted character an upward floating animation while it gradually fades away.

class GhostChar {
    constructor(char, x, y) {
        this.char = char; this.x = x; this.y = y;
        // It floats randomly upwards, with a slight left-right offset, making it look more natural.
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -Math.random() * 0.5 - 0.2;
        this.life = 1; // Health
        this.opacity = 0.6; // Initial transparency
        this.rotation = (Math.random() - 0.5) * 0.1; // Slight rotation
    }

    update() {
        this.x += this.vx; this.y += this.vy;
        // Velocity decay - simulates air resistance for a softer floating effect
        this.vx *= 0.98; this.vy *= 0.98;
        // Slowly disappears - this speed needs to be very slow to be visible
        this.life -= 0.004;
        this.opacity = 0.6 * this.life;
        // Rotation also slowly returns to zero
        this.rotation *= 0.98;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.opacity * 0.5;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.font = `300 18px "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = COLORS.ghost;
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, 0, 0);
        
        // Draw a strikethrough line
        ctx.globalAlpha = this.opacity * 0.4;
        ctx.strokeStyle = COLORS.ghost;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const w = ctx.measureText(this.char).width;
        ctx.moveTo(-w/2, 0); ctx.lineTo(w/2, 0);
        ctx.stroke();
        ctx.restore();
    }
}

// ========================================
// Ripple Effect Class
// ========================================
// Referenced the circle drawing and animation sections from the MDN Canvas tutorial.
// Principle: Increase the radius each frame while decreasing the opacity to create a spreading and fading effect.

class Ripple {
    constructor(x, y, emotion) {
        this.x = x; this.y = y;
        this.radius = 5;
        // Different emotions have different ripple sizes and speeds - took many tries to get the right feel
        // Rush should be fast and small, hesitate should be slow and large
        this.maxR = emotion === 'rush' ? 60 : (emotion === 'hesitate' ? 100 : 80);
        this.speed = emotion === 'rush' ? 3 : (emotion === 'hesitate' ? 1.5 : 2);
        this.color = COLORS[emotion];
        this.life = 1;
    }

    update() {
        this.radius += this.speed;
        // Health decreases as radius increases, so it disappears when fully expanded
        this.life = 1 - this.radius / this.maxR;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life * 0.3;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// ========================================
// Particle Effect Class (appears when hesitating)
// ========================================
// Referenced the implementation approach from the YouTube "Canvas Particle System Tutorial"
// Each particle is a small dot with random velocity and lifecycle

class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        // Random size for a more natural effect
        this.size = Math.random() * 2 + 1;
        // Random horizontal velocity (-0.15 to 0.15), floating upward
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = -Math.random() * 0.4;
        this.life = 1; // Health starts at 1 and decreases to 0, then disappears
    }

    update() {
        this.x += this.vx; this.y += this.vy;
        // Velocity gradually decays, simulating air resistance - this 0.99 was found through trial and error
        this.vx *= 0.99; this.vy *= 0.99;
        // Health slowly decreases
        this.life -= 0.008;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life * 0.25;
        ctx.fillStyle = COLORS.hesitate;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ========================================
// Helper Functions
// ========================================

function addParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y));
    }
}

// Calculate text position (automatic line wrapping)
function getPos(char, spacingMod = 0) {
    ctx.font = `28px "Microsoft YaHei", sans-serif`;
    const w = ctx.measureText(char).width + spacingMod;
    
    if (curX + w > maxWidth || char === '\n') {
        curX = startX;
        curY += lineHeight;
    }
    
    const pos = { x: curX, y: curY };
    if (char !== '\n') curX += w + (char === ' ' ? 14 : 4);
    return pos;
}

// Update the stats panel in the top-right corner
function updateUI(ms, state) {
    const labels = { rush: 'Rush', steady: 'Steady', slow: 'Slow', hesitate: 'Hesitate' };
    document.getElementById('rhythmVal').textContent = labels[state] || '-';
    document.getElementById('charCount').textContent = chars.length;
    document.getElementById('deleteCount').textContent = delCount;
    document.getElementById('hesitationCount').textContent = pauseCount;

    // Small dot color changes accordingly
    const dot = document.getElementById('emotionDot');
    dot.style.background = COLORS[state];
    dot.style.boxShadow = `0 0 10px ${COLORS[state]}`;
}

// Delete key handler
function handleDelete() {
    if (chars.length === 0) return;
    const removed = chars.pop();
    curX = removed.x; curY = removed.baseY;
    ghosts.push(new GhostChar(removed.char, removed.x, removed.y));
    addParticles(removed.x, removed.y, 5);
    delCount++;
    if (audioReady) synth.triggerAttackRelease('A2', '32n');  // Low tone when deleting
}

// Input character handler
function handleType(key, ms, state) {
    const pos = getPos(key);
    ripples.push(new Ripple(pos.x, pos.y, state));
    chars.push(new TextChar(key, pos.x, pos.y, ms, state));
    if (state === 'hesitate') addParticles(pos.x, pos.y - 5, 3);
}

// ========================================
// Keyboard Event Listener
// ========================================

input.addEventListener('keydown', async (e) => {
    // Hide the intro screen on the first key press
    const intro = document.getElementById('intro');
    if (!intro.classList.contains('hidden')) {
        intro.classList.add('hidden');
        cursorVisible = true;
        setTimeout(() => {
            document.querySelectorAll('.ui-overlay').forEach(el => el.classList.add('show'));
            document.getElementById('legend').classList.add('show');
        }, 500);
        await initAudio();

        // Play the demo after entering the interface (only once)
        if (!demoPlayed) {
            demoPlayed = true;
            playDemo();
        }
        return; // The first key press is only for entering the interface, not recording typing
    }

    // Calculate the interval since the last key press
    const now = Date.now();
    const interval = lastTime ? now - lastTime : 0;
    lastTime = now;

    // Determine the emotion and record it
    const state = getEmotion(interval);
    history.push({ key: e.key, time: now, interval, state });

    // If there's a long pause, count it as a "hesitation"
    if (state === 'hesitate' && interval > 600) pauseCount++;
    updateUI(interval, state);

    // Play the corresponding sound
    if (audioReady && e.key.length === 1 && e.key !== ' ') {
        synth.triggerAttackRelease(getNote(interval), state === 'hesitate' ? '2n' : '8n');
    }

    // Delete key
    if (e.key === 'Backspace') {
        handleDelete();
        updateUI(interval, state);
        return;
    }

    // Ignore function keys (Shift, Ctrl, etc.)
    if (e.key.length !== 1) return;

    // Spacebar special handling: draw a dashed line
    if (e.key !== ' ') {
        handleType(e.key, interval, state);
    } else {
        const pos = getPos(e.key);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(pos.x - 3, pos.y - 18);
        ctx.lineTo(pos.x - 3, pos.y + 18);
        ctx.stroke();
    }
});

// ========================================
// Playback Functionality
// ========================================

let replaying = false, replayIdx = 0, replayStart = 0, replayData = null;

document.getElementById('replayBtn').addEventListener('click', () => {
    if (history.length < 2) return;
    
    if (!replaying) {
        // Start playback
        replaying = true;
        replayIdx = 0;
        replayStart = performance.now();
        replayData = [...history];
        document.getElementById('replayBtn').textContent = 'Stop';
        document.getElementById('modeIndicator').textContent = 'Replaying';

        // Clear the canvas
        chars = []; ghosts = []; ripples = []; particles = [];
        curX = startX; curY = startY;
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Stop playback
        replaying = false;
        replayData = null;
        document.getElementById('replayBtn').textContent = 'Replay';
        document.getElementById('modeIndicator').textContent = 'Typing';
    }
});

// ========================================
// Animation Main Loop
// ========================================
// Referenced the MDN requestAnimationFrame tutorial.
// Uses 60fps as the baseline, with dt used to adjust animation speed for different frame rates.

let lastFrame = performance.now();

function animate(time) {
    // Calculate the time difference, normalized to the frame time of 60fps (16.67ms).
    // This ensures a consistent animation speed even if the frame rate fluctuates.
    const dt = (time - lastFrame) / 16.67;
    lastFrame = time;

    // Playback logic
    if (replaying && replayData) {
        const elapsed = time - replayStart;
        while (replayIdx < replayData.length) {
            const stroke = replayData[replayIdx];
            if (elapsed >= stroke.time - replayData[0].time) {
                if (stroke.key.length === 1 && stroke.key !== ' ') {
                    handleType(stroke.key, stroke.interval, stroke.state);
                } else if (stroke.key === 'Backspace') {
                    handleDelete();
                }
                replayIdx++;
            } else break;
        }

        if (replayIdx >= replayData.length) {
            replaying = false;
            replayData = null;
            document.getElementById('replayBtn').textContent = 'Replay';
            document.getElementById('modeIndicator').textContent = 'Typing';
        }
    }

    // Use a semi-transparent overlay to achieve a trailing effect.
    ctx.fillStyle = 'rgba(10, 10, 15, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw all elements
    ripples = ripples.filter(r => { r.update(); r.draw(ctx); return r.life > 0; });
    particles = particles.filter(p => { p.update(); p.draw(ctx); return p.life > 0; });
    ghosts = ghosts.filter(g => { g.update(); g.draw(ctx); return g.life > 0; });
    chars.forEach(c => { c.update(dt); c.draw(ctx); });

    // Draw the cursor - color changes with the current emotion.
    if (cursorVisible) {
        const t = time * 0.003;
        const bounce = Math.sin(t * 3) * 4;
        const glow = 0.5 + Math.sin(t * 2) * 0.3;

        // Get the color corresponding to the current emotion
        const currentRhythm = document.getElementById('rhythmVal').textContent;
        const rhythmToColor = {
            'Rush': COLORS.rush,
            'Steady': COLORS.steady,
            'Slow': COLORS.slow,
            'Hesitate': COLORS.hesitate
        };
        const cursorColor = rhythmToColor[currentRhythm] || COLORS.hesitate;

        ctx.save();
        ctx.translate(curX + 8, curY + bounce);
        ctx.shadowColor = cursorColor;
        ctx.shadowBlur = 18 * glow;
       
        const r = parseInt(cursorColor.slice(1, 3), 16);
        const g = parseInt(cursorColor.slice(3, 5), 16);
        const b = parseInt(cursorColor.slice(5, 7), 16);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.6 + glow * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -16); ctx.lineTo(0, 16);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${glow})`;
        ctx.beginPath();
        ctx.arc(0, 16, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    requestAnimationFrame(animate);
}

animate(performance.now());

// ========================================
// Button Events
// ========================================

// Clear button
document.getElementById('clearBtn').addEventListener('click', () => {
    chars = []; ghosts = []; ripples = []; particles = [];
    history = []; delCount = 0; pauseCount = 0;
    curX = startX; curY = startY; lastTime = 0;
    replaying = false; replayData = null;
    document.getElementById('replayBtn').textContent = 'Replay';
    document.getElementById('modeIndicator').textContent = 'Typing';
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateUI(0, 'steady');
    input.value = '';
});

// Save button (export image)
document.getElementById('saveBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `between-typings-${Date.now()}.png`;
    a.href = canvas.toDataURL();
    a.click();
});

// Auto-focus the input field
input.focus();
window.addEventListener('click', () => input.focus());
