document.addEventListener('DOMContentLoaded', () => {
    const targetColor = document.getElementById('targetColor');
    const targetHex = document.getElementById('targetHex');
    const hexInput = document.getElementById('hexInput');
    const submitBtn = document.getElementById('submitBtn');
    const nextBtn = document.getElementById('nextBtn');
    const scoreElement = document.getElementById('score');
    const similarityElement = document.getElementById('similarity');
    const pointsElement = document.getElementById('points');

    let currentScore = 0;
    let currentTargetColor = '';
    let totalPointsEarned = 0;
    let isSubmitting = false; // Pour éviter les soumissions multiples
    let gameStartTime = Date.now();
    let attemptsCount = 0;
    const MAX_ATTEMPTS = 100; // Limite de sécurité pour éviter les abus

    // Protection anti triche
    let lastKeyTime = 0;
    let rapidTypeCount = 0;
    let lastColorTime = 0;

    // Génère une couleur hexadécimale aléatoire
    function generateRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Calcule la similarité entre deux couleurs
    function calculateColorSimilarity(color1, color2) {
        try {
            const r1 = parseInt(color1.slice(1, 3), 16);
            const g1 = parseInt(color1.slice(3, 5), 16);
            const b1 = parseInt(color1.slice(5, 7), 16);
            const r2 = parseInt(color2.slice(1, 3), 16);
            const g2 = parseInt(color2.slice(3, 5), 16);
            const b2 = parseInt(color2.slice(5, 7), 16);

            if (isNaN(r1) || isNaN(g1) || isNaN(b1) || isNaN(r2) || isNaN(g2) || isNaN(b2)) {
                throw new Error('Invalid color values');
            }

            const maxDiff = Math.sqrt(3 * Math.pow(255, 2));
            const diff = Math.sqrt(
                Math.pow(r1 - r2, 2) +
                Math.pow(g1 - g2, 2) +
                Math.pow(b1 - b2, 2)
            );

            return Math.round((1 - diff / maxDiff) * 100);
        } catch (error) {
            console.error('Error calculating color similarity:', error);
            return 0;
        }
    }

    // Calcule les points en fonction de la similarité
    function calculatePoints(similarity) {
        if (typeof similarity !== 'number' || isNaN(similarity)) return 0;
        if (similarity >= 95) return 100;
        if (similarity >= 90) return 75;
        if (similarity >= 80) return 50;
        if (similarity >= 70) return 25;
        if (similarity >= 60) return 10;
        return 0;
    }

    // Met à jour l'affichage de la couleur cible
    function updateTargetColor() {
        try {
            currentTargetColor = generateRandomColor();
            targetColor.style.backgroundColor = currentTargetColor;
            targetHex.textContent = '?';
            lastColorTime = Date.now();

            const r = parseInt(currentTargetColor.slice(1, 3), 16);
            const g = parseInt(currentTargetColor.slice(3, 5), 16);
            const b = parseInt(currentTargetColor.slice(5, 7), 16);
            
            if (isNaN(r) || isNaN(g) || isNaN(b)) {
                throw new Error('Invalid color values');
            }

            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            targetHex.style.color = brightness > 128 ? '#000000' : '#FFFFFF';
        } catch (error) {
            console.error('Error updating target color:', error);
            // En cas d'erreur, générer une nouvelle couleur
            setTimeout(updateTargetColor, 100);
        }
    }

    // Vérifie la validité du code hex
    function isValidHex(color) {
        return /^#[0-9A-F]{6}$/i.test(color);
    }

    // Vérifie si le joueur a le droit de continuer
    function canContinuePlaying() {
        const timeElapsed = Date.now() - gameStartTime;
        const hoursPlayed = timeElapsed / (1000 * 60 * 60);
        
        if (attemptsCount >= MAX_ATTEMPTS) {
            alert('Limite de tentatives atteinte. Merci de recharger la page pour continuer.');
            return false;
        }
        
        if (hoursPlayed > 2) { // Limite de 2 heures de jeu
            alert('Session de jeu terminée. Merci de recharger la page pour continuer.');
            return false;
        }
        
        return true;
    }

    // Gère la soumission de la couleur
    async function handleSubmit() {
        if (isSubmitting || !canContinuePlaying()) return;

        // anti bot: refuse soumission trop rapide apres affichage de la couleur
        if (Date.now() - lastColorTime < 300) {
            alert('Action trop rapide, merci de jouer normalement.');
            return;
        }

        if (rapidTypeCount >= 5) {
            alert('Saisie détectée comme automatisée.');
            return;
        }
        
        try {
            isSubmitting = true;
            const userColor = hexInput.value.toUpperCase();
            
            if (!isValidHex(userColor)) {
                alert('Veuillez entrer un code couleur hexadécimal valide (ex: #RRGGBB)');
                return;
            }

            attemptsCount++;
            const similarity = calculateColorSimilarity(currentTargetColor, userColor);
            const points = calculatePoints(similarity);

            targetHex.textContent = currentTargetColor;
            similarityElement.textContent = `${similarity}%`;
            pointsElement.textContent = points;

            if (points > 0) {
                currentScore += points;
                totalPointsEarned += points;
                scoreElement.textContent = currentScore;
            }

            submitBtn.style.display = 'none';
            nextBtn.style.display = 'block';
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            isSubmitting = false;
        }
    }

    // Initialise le jeu
    function initGame() {
        if (!canContinuePlaying()) return;
        
        updateTargetColor();
        submitBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        similarityElement.textContent = '0%';
        pointsElement.textContent = '0';
        hexInput.value = '';
        hexInput.focus();
    }

    // Gère la fermeture de la page
    window.addEventListener('beforeunload', async (event) => {
        if (totalPointsEarned > 0) {
            try {
                await api.post('/api/user/points', { 
                    points: totalPointsEarned,
                    game: 'color',
                    attempts: attemptsCount,
                    duration: Date.now() - gameStartTime
                });
            } catch (error) {
                console.error('Erreur lors de l\'envoi des points:', error);
                // Stocker les points en attente dans le localStorage
                const pendingPoints = JSON.parse(localStorage.getItem('pendingPoints') || '[]');
                pendingPoints.push({
                    points: totalPointsEarned,
                    game: 'color',
                    timestamp: Date.now()
                });
                localStorage.setItem('pendingPoints', JSON.stringify(pendingPoints));
            }
        }
    });

    // Event listeners avec debounce pour éviter les soumissions multiples
    let debounceTimer;
    hexInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            e.target.value = e.target.value.toUpperCase();
        }, 100);
    });

    hexInput.addEventListener('keydown', (e) => {
        const now = Date.now();
        if (lastKeyTime && now - lastKeyTime < 40) {
            rapidTypeCount++;
        } else {
            rapidTypeCount = 0;
        }
        lastKeyTime = now;

        const allowed = /^[0-9A-Fa-f]$/;
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === '#') return;
        if (!allowed.test(e.key)) {
            e.preventDefault();
        }
    });

    hexInput.addEventListener('paste', e => e.preventDefault());
    hexInput.addEventListener('contextmenu', e => e.preventDefault());

    hexInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isSubmitting) {
            handleSubmit();
        }
    });

    submitBtn.addEventListener('click', handleSubmit);
    nextBtn.addEventListener('click', initGame);

    // Initialisation
    initGame();
}); 