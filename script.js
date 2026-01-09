// Game state
const gameState = {
    cards: [],
    flipped: [],
    matched: [],
    isLocked: false,
    currentAudio: null,
    soundFiles: [],
    successFiles: [],
    lastSuccessIndex: null
    ,finalInterval: null
};

// Configuration
const CONFIG = {
    PAIRS: 14,
    FLIP_DELAY: 600,
    RESET_DELAY: 1000,
    CONFETTI_DURATION: 4000,
    MESSAGE: 'Happy Birthday Satabdi Express 🎉'
};

// Initialize game on load
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    loadSoundFiles();
    loadSuccessFiles();
    preventScrolling();
    // Add end game button for testing
    const endBtn = document.getElementById('endGameBtn');
    if (endBtn) {
        endBtn.addEventListener('click', () => {
            endGame();
        });
    }
});

// Prevent scrolling
function preventScrolling() {
    document.body.style.overflow = 'hidden';
}

// Load available sound files dynamically
async function loadSoundFiles() {
    const soundArray = [];
    const maxAttempts = 50; // Try up to 50 sound files
    
    // Try to load sound files sequentially
    for (let i = 1; i <= maxAttempts; i++) {
        const audio = new Audio(`sounds/sound${i}.mp3`);
        
        // Create a promise that resolves when audio loads or rejects on error
        const loadPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Load timeout'));
            }, 2000); // 2 second timeout per file
            
            audio.addEventListener('canplay', () => {
                clearTimeout(timeout);
                resolve(audio);
            }, { once: true });
            
            audio.addEventListener('error', () => {
                clearTimeout(timeout);
                reject(new Error('Load error'));
            }, { once: true });
            
            // Trigger load
            audio.preload = 'auto';
            audio.load();
        });
        
        try {
            const loadedAudio = await loadPromise;
            loadedAudio.volume = 0.6;
            soundArray.push(loadedAudio);
        } catch (error) {
            // This file doesn't exist, continue to next
            if (i > 1) {
                // If we've found at least one sound and this one failed, we can stop
                if (soundArray.length > 0) {
                    break;
                }
            }
        }
    }
    
    // Always have at least sound1.mp3
    if (soundArray.length === 0) {
        const fallbackAudio = new Audio('sounds/sound1.mp3');
        fallbackAudio.volume = 0.6;
        fallbackAudio.preload = 'auto';
        soundArray.push(fallbackAudio);
    }
    
    gameState.soundFiles = soundArray;
}

    // Load specific success sounds (optional files)
    async function loadSuccessFiles() {
        const candidates = ['sounds/soundsuccess1.mp3', 'sounds/soundsuccess.mp3'];
        const loaded = [];
        for (const src of candidates) {
            try {
                const audio = new Audio(src);
                const p = new Promise((resolve, reject) => {
                    const t = setTimeout(() => reject(new Error('timeout')), 2000);
                    audio.addEventListener('canplay', () => { clearTimeout(t); resolve(audio); }, { once: true });
                    audio.addEventListener('error', () => { clearTimeout(t); reject(new Error('error')); }, { once: true });
                    audio.preload = 'auto';
                    audio.load();
                });
                const a = await p.catch(() => null);
                if (a) {
                    a.volume = 0.75;
                    loaded.push(a);
                }
            } catch (e) {
                // ignore missing files
            }
        }
        gameState.successFiles = loaded;
    }

// Play mistake sound
function playMistakeSound() {
    if (gameState.soundFiles.length === 0) return;
    
    // Select random sound, not the same as last played
    let randomIndex;
    let attempts = 0;
    do {
        randomIndex = Math.floor(Math.random() * gameState.soundFiles.length);
        attempts++;
    } while (
        gameState.soundFiles.length > 1 &&
        gameState.lastAudioIndex === randomIndex &&
        attempts < 10
    );
    const audio = gameState.soundFiles[randomIndex];
    if (!audio) return;
    try {
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {})
                .catch((error) => {
                    // Silently handle playback errors
                    console.log('Audio playback error:', error.message);
                });
        }
        gameState.currentAudio = audio;
        gameState.lastAudioIndex = randomIndex;
    } catch (error) {
        // Silently fail if anything goes wrong
        console.log('Error playing sound:', error.message);
    }
}

// Play success sound (randomly choose between loaded success files)
function playSuccessSound() {
    const files = gameState.successFiles || [];
    if (files.length > 0) {
        let idx, attempts = 0;
        do {
            idx = Math.floor(Math.random() * files.length);
            attempts++;
        } while (files.length > 1 && gameState.lastSuccessIndex === idx && attempts < 10);

        const audio = files[idx];
        if (!audio) return;
        try {
            audio.currentTime = 0;
            const p = audio.play();
            if (p !== undefined) p.catch(() => {});
            gameState.currentAudio = audio;
            gameState.lastSuccessIndex = idx;
        } catch (e) {
            // ignore
        }
    } else {
        // fallback if none preloaded
        const audio = new Audio('sounds/soundsuccess1.mp3');
        audio.volume = 0.75;
        audio.play().catch(() => {});
        gameState.currentAudio = audio;
    }
}

// Initialize game
function initializeGame() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    
    // Create pairs: each image index appears twice
    const cardIndices = [];
    for (let i = 1; i <= CONFIG.PAIRS; i++) {
        cardIndices.push(i);
        cardIndices.push(i);
    }
    
    // Shuffle the cards
    gameState.cards = shuffleArray(cardIndices);
    gameState.flipped = [];
    gameState.matched = [];
    gameState.isLocked = false;
    
    // Create card elements
    gameState.cards.forEach((imageIndex, cardIndex) => {
        const card = createCardElement(cardIndex, imageIndex);
        gameBoard.appendChild(card);
    });
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Create a card element
function createCardElement(cardIndex, imageIndex) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.cardIndex = cardIndex;
    card.dataset.imageIndex = imageIndex;
    
    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front"></div>
            <div class="card-back">
                <img src="images/${imageIndex}.jpeg" alt="Card ${imageIndex}">
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => handleCardClick(cardIndex, card));
    
    return card;
}

// Handle card click
function handleCardClick(cardIndex, cardElement) {
    // Prevent interactions if game is locked, card is already flipped, or card is matched
    if (gameState.isLocked) return;
    if (gameState.flipped.includes(cardIndex)) return;
    if (gameState.matched.includes(cardIndex)) return;
    
    // Flip the card
    flipCard(cardIndex, cardElement);
    
    // Add to flipped list
    gameState.flipped.push(cardIndex);
    
    // Check if two cards are flipped
    if (gameState.flipped.length === 2) {
        gameState.isLocked = true;
        checkMatch();
    }
}

// Flip card with animation
function flipCard(cardIndex, cardElement) {
    cardElement.classList.add('flipped');
}

// Check if the two flipped cards match
function checkMatch() {
    const [cardIndex1, cardIndex2] = gameState.flipped;
    const cardElements = document.querySelectorAll('.card');
    const card1 = cardElements[cardIndex1];
    const card2 = cardElements[cardIndex2];
    
    const imageIndex1 = gameState.cards[cardIndex1];
    const imageIndex2 = gameState.cards[cardIndex2];
    
    if (imageIndex1 === imageIndex2) {
        // Play success sound
        playSuccessSound();
        // Match found
        setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');
            gameState.matched.push(cardIndex1, cardIndex2);
            gameState.flipped = [];
            gameState.isLocked = false;
            // Check if game is won
            if (gameState.matched.length === CONFIG.PAIRS * 2) {
                endGame();
            }
        }, CONFIG.FLIP_DELAY);
    } else {
        // No match
        playMistakeSound();
        
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            gameState.flipped = [];
            gameState.isLocked = false;
        }, CONFIG.RESET_DELAY);
    }
}

// End game and show celebration
function endGame() {
    // Disable all cards
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach(card => {
        card.style.pointerEvents = 'none';
    });
    
    // Blur game, title, and background
    document.getElementById('mainContainer').classList.add('blurred');
    document.body.classList.add('background-blur');

    // Show end screen
    const endScreen = document.getElementById('endScreen');
    const messageBox = document.getElementById('endMessage');
    messageBox.innerHTML = CONFIG.MESSAGE;
    endScreen.classList.remove('hidden');

    // Start background confetti (all images, more for celebration)
    startConfettiAnimation(60);

    // Pop out matched puzzle images as confetti in the background
    setTimeout(() => {
        popMatchedImagesConfetti();
    }, 400);

    // Play final win sound repeatedly every 2 seconds while end screen is visible
    try {
        if (!gameState.finalInterval) {
            // Play immediately once
            const first = new Audio('sounds/soundfinal.mp3');
            first.volume = 0.85;
            first.play().catch(() => {});

            // Then schedule repeated plays every 2 seconds
            gameState.finalInterval = setInterval(() => {
                const a = new Audio('sounds/soundfinal.mp3');
                a.volume = 0.85;
                a.play().catch(() => {});
            }, 2000);
        }
    } catch (e) {
        // silently ignore if audio not available or playback blocked
    }
}

// Create and animate confetti
function startConfettiAnimation(confettiCount = 30) {
    const container = document.getElementById('confettiContainer');
    const duration = CONFIG.CONFETTI_DURATION;
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = createConfettiImage();
            container.appendChild(confetti);
            // Animate confetti
            const randomDelay = Math.random() * 500;
            const randomDuration = 3000 + Math.random() * 1500;
            confetti.style.animation = `confettiFall ${randomDuration}ms linear ${randomDelay}ms forwards`;
            // Remove element after animation completes
            setTimeout(() => {
                confetti.remove();
            }, randomDelay + randomDuration);
        }, i * 30);
    }
}

// Create a confetti image element
function createConfettiImage() {
    const confetti = document.createElement('img');
    confetti.className = 'confetti-image';
    
    // Random image from 1-14
    const randomImageIndex = Math.floor(Math.random() * CONFIG.PAIRS) + 1;
    confetti.src = `images/${randomImageIndex}.jpeg`;
    
    // Random horizontal position (avoid off-screen)
    const randomX = Math.random() * (window.innerWidth - 60) + 30;
    confetti.style.left = randomX + 'px';
    confetti.style.top = '-60px';
    
    // Random rotation
    const randomRotation = Math.random() * 360;
    confetti.style.transform = `rotate(${randomRotation}deg)`;
    
    // Add slight horizontal drift
    const driftAmount = (Math.random() - 0.5) * 200;
    const driftStart = Math.random() * 0.3;
    confetti.style.setProperty('--drift', driftAmount + 'px');
    confetti.style.setProperty('--drift-start', driftStart);
    
    return confetti;
}

// Pop out matched puzzle images as confetti in the background
function popMatchedImagesConfetti() {
    const container = document.getElementById('confettiContainer');
    const matchedImages = Array.from(new Set(gameState.matched.map(idx => gameState.cards[idx])));
    if (matchedImages.length === 0) return;
    const centerY = window.innerHeight / 2;
    const centerX = window.innerWidth / 2;
    matchedImages.forEach((imgIdx, i) => {
        const confetti = document.createElement('img');
        confetti.className = 'confetti-image';
        confetti.src = `images/${imgIdx}.jpeg`;
        confetti.style.left = `${centerX - 30 + (Math.random() - 0.5) * 40}px`;
        confetti.style.top = `${centerY - 30 + (Math.random() - 0.5) * 40}px`;
        confetti.style.zIndex = 200; // below end-screen
        confetti.style.opacity = 1;
        confetti.style.width = '80px';
        confetti.style.height = '80px';
        container.appendChild(confetti);
        // Animate outward and fade
        const angle = (2 * Math.PI * i) / matchedImages.length;
        const dist = 350 + Math.random() * 100;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        setTimeout(() => {
            confetti.animate([
                { transform: 'scale(1) translate(0,0)', opacity: 1 },
                { transform: `scale(1.2) translate(${dx}px,${dy}px)`, opacity: 0 }
            ], {
                duration: 1800 + Math.random() * 600,
                easing: 'cubic-bezier(0.4,0.2,0.2,1)',
                fill: 'forwards'
            });
            setTimeout(() => confetti.remove(), 2000);
        }, 50 + Math.random() * 200);
    });
}

// Add drift animation via custom properties
const style = document.createElement('style');
style.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
        }
        20% {
            transform: translateY(20vh) translateX(var(--drift)) rotate(180deg);
            opacity: 1;
        }
        80% {
            transform: translateY(80vh) translateX(calc(var(--drift) * 1.5)) rotate(540deg);
            opacity: 0.3;
        }
        100% {
            transform: translateY(120vh) translateX(calc(var(--drift) * 2)) rotate(720deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
