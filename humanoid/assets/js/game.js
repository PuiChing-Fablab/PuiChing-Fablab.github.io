(function () {
    'use strict';

    var words = [
        // Level 1 — Easy (4-5 letters)
        { word: 'ROBOT', category: 'Robotics' },
        { word: 'SERVO', category: 'Hardware' },
        { word: 'MOTOR', category: 'Hardware' },
        { word: 'LIDAR', category: 'Sensor' },
        { word: 'JOINT', category: 'Mechanics' },
        { word: 'GYRO', category: 'Sensor' },
        { word: 'KICK', category: 'Soccer' },
        { word: 'WALK', category: 'Motion' },
        { word: 'BALL', category: 'Soccer' },
        { word: 'GOAL', category: 'Soccer' },
        // Level 2 — Medium (5-7 letters)
        { word: 'SENSOR', category: 'Hardware' },
        { word: 'VISION', category: 'AI' },
        { word: 'NEURAL', category: 'AI' },
        { word: 'TORQUE', category: 'Physics' },
        { word: 'STRIDE', category: 'Motion' },
        { word: 'CAMERA', category: 'Sensor' },
        { word: 'PYTHON', category: 'Code' },
        { word: 'MATRIX', category: 'Math' },
        { word: 'DECODE', category: 'Hacking' },
        { word: 'BINARY', category: 'Code' },
        // Level 3 — Hard (7-10 letters)
        { word: 'HUMANOID', category: 'Robotics' },
        { word: 'ROBOCUP', category: 'Competition' },
        { word: 'BALANCE', category: 'Motion' },
        { word: 'INVERSE', category: 'Math' },
        { word: 'ACTUATOR', category: 'Hardware' },
        { word: 'DYNAMICS', category: 'Physics' },
        { word: 'FIRMWARE', category: 'Code' },
        { word: 'PROTOCOL', category: 'Network' },
        { word: 'ALGORITHM', category: 'Code' },
        { word: 'KINEMATIC', category: 'Robotics' }
    ];

    var levelNames = ['Initiate', 'Operative', 'Elite', 'Master', 'Legendary'];
    var score = 0, combo = 0, level = 1, highScore = 0;
    try { highScore = Math.max(0, parseInt(localStorage.getItem('pcmshrg_highscore'), 10) || 0); } catch (e) { /* storage unavailable */ }
    var currentWord = null, timer = null, timeLeft = 0, maxTime = 0;
    var isPlaying = false, roundResolved = false;
    var revealInterval = null, nextTimer = null, endTimer = null, deadline = 0;
    var screen = document.querySelector('.game-screen');
    var text = window.PCMSI18n.text;

    function clearTimers() {
        clearInterval(timer);
        clearInterval(revealInterval);
        clearTimeout(nextTimer);
        clearTimeout(endTimer);
    }

    var scoreEl = document.getElementById('scoreDisplay');
    var comboEl = document.getElementById('comboDisplay');
    var levelEl = document.getElementById('levelDisplay');
    var levelBadge = document.getElementById('levelBadge');
    var timerBar = document.getElementById('timerBar');
    var scrambleEl = document.getElementById('scrambleDisplay');
    var inputEl = document.getElementById('gameInput');
    var startBtn = document.getElementById('startBtn');
    var restartBtn = document.getElementById('restartBtn');
    var gameOver = document.getElementById('gameOver');
    var finalScoreEl = document.getElementById('finalScore');
    var highScoreEl = document.getElementById('highScoreDisplay');

    // Matrix rain
    var matrixRain = document.getElementById('matrixRain');
    function initMatrix() {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (var i = 0; i < 8; i++) {
            var col = document.createElement('div');
            col.className = 'matrix-col';
            col.style.left = (Math.random() * 100) + '%';
            col.style.animationDuration = (3 + Math.random() * 5) + 's';
            col.style.animationDelay = (Math.random() * 3) + 's';
            var text = '';
            for (var j = 0; j < 30; j++) text += chars.charAt(Math.floor(Math.random() * chars.length)) + '\n';
            col.textContent = text;
            matrixRain.appendChild(col);
        }
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) initMatrix();

    function scrambleWord(word) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
        var result = '';
        for (var i = 0; i < word.length; i++) {
            if (Math.random() < 0.4) {
                result += word[i];
            } else {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        return result;
    }

    function getTimeForLevel() {
        return Math.max(3000, 8000 - (level - 1) * 800);
    }

    function getWordsForLevel() {
        if (level <= 2) return words.filter(function (w) { return w.word.length <= 5; });
        if (level <= 4) return words.filter(function (w) { return w.word.length <= 7; });
        return words;
    }

    function updateDisplay() {
        scoreEl.textContent = score;
        comboEl.textContent = combo + 'x';
        levelEl.textContent = level;
        var lvlName = levelNames[Math.min(level - 1, levelNames.length - 1)];
        levelBadge.textContent = text('LEVEL {level} — {name}', { level: level, name: text(lvlName) });
        highScoreEl.textContent = text('HIGH SCORE: {score}', { score: highScore });
        if (!currentWord) scrambleEl.textContent = text('PRESS START');
    }

    function nextWord() {
        if (!isPlaying) return;
        clearTimers();
        roundResolved = false;
        inputEl.disabled = false;
        var pool = getWordsForLevel();
        currentWord = pool[Math.floor(Math.random() * pool.length)];
        maxTime = getTimeForLevel();
        timeLeft = maxTime;
        deadline = performance.now() + maxTime;
        timerBar.style.width = '100%';
        timerBar.className = 'timer-bar';

        // Animate scramble reveal
        var revealCount = 0;
        revealInterval = setInterval(function () {
            scrambleEl.textContent = scrambleWord(currentWord.word);
            scrambleEl.className = 'scramble-display';
            revealCount++;
            if (revealCount > 8) {
                clearInterval(revealInterval);
                scrambleEl.textContent = scrambleWord(currentWord.word);
            }
        }, 60);

        inputEl.value = '';
        inputEl.focus();

        // Start timer
        clearInterval(timer);
        timer = setInterval(function () {
            timeLeft = Math.max(0, deadline - performance.now());
            var pct = (timeLeft / maxTime) * 100;
            timerBar.style.width = pct + '%';
            timerBar.className = pct < 25 ? 'timer-bar danger' : 'timer-bar';

            // Keep scrambling
            if (Math.random() < 0.3) {
                scrambleEl.textContent = scrambleWord(currentWord.word);
            }

            if (timeLeft <= 0) {
                endGame();
            }
        }, 50);
    }

    function checkAnswer() {
        if (!currentWord || !isPlaying || roundResolved) return;
        timeLeft = Math.max(0, deadline - performance.now());
        if (timeLeft <= 0) { endGame(); return; }
        var answer = inputEl.value.trim().toUpperCase();
        if (answer === currentWord.word) {
            // Resolve this round before updating the score or scheduling another.
            roundResolved = true;
            clearTimers();
            inputEl.disabled = true;
            combo++;
            var points = 100 + (combo * 20) + Math.floor(timeLeft / 100);
            score += points;

            // Level up every 3 correct
            if (combo % 3 === 0) level++;

            scrambleEl.textContent = currentWord.word;
            scrambleEl.className = 'scramble-display correct';

            updateDisplay();

            nextTimer = setTimeout(nextWord, 400);
        }
    }

    function startGame() {
        clearTimers();
        currentWord = null;
        screen.classList.add('is-playing');
        gameOver.setAttribute('aria-hidden', 'true');
        gameOver.inert = true;
        score = 0;
        combo = 0;
        level = 1;
        isPlaying = true;
        gameOver.classList.remove('show');
        startBtn.style.display = 'none';
        inputEl.disabled = false;
        updateDisplay();
        nextWord();
    }

    function endGame() {
        if (!isPlaying) return;
        isPlaying = false;
        roundResolved = true;
        clearTimers();
        screen.classList.remove('is-playing');
        inputEl.disabled = true;

        scrambleEl.textContent = currentWord.word;
        scrambleEl.className = 'scramble-display wrong';

        if (score > highScore) {
            highScore = score;
            try { localStorage.setItem('pcmshrg_highscore', highScore.toString()); } catch (e) { /* keep the session score */ }
        }

        finalScoreEl.textContent = score;
        updateDisplay();

        endTimer = setTimeout(function () {
            gameOver.classList.add('show');
            gameOver.setAttribute('aria-hidden', 'false');
            gameOver.inert = false;
            restartBtn.focus({ preventScroll: true });
        }, 600);
    }

    // Event listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    inputEl.addEventListener('input', checkAnswer);
    inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') checkAnswer();
    });

    document.addEventListener('i18n:applied', updateDisplay);
    updateDisplay();
})();
