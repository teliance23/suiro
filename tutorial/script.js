let currentStep = 1;
const totalSteps = 5;

// Color mapping
const colorMap = {
    'V': '#BEA1E5', 'O': '#FFBB45', 'B': '#5DB2FF', 'R': '#FF8A7A', 'J': '#FFEB6A',
    'T': '#64EAE6', 'M': '#FFA8CB', 'P': '#C9A387', 'G': '#5BD87A'
};

// Sample grids for each step
const grids = {
    1: [
        ['3V', '5B', '2G', '', '', '', '1T', '', ''],
        ['1P', '7J', '9R', '', '', '', '4V', '', ''],
        ['6O', '8M', '4T', '', '', '', '2P', '', ''],
        ['', '', '', '', '', '', '5O', '', ''],
        ['', '', '', '', '', '', '3M', '', ''],
        ['', '', '', '', '', '', '6J', '', ''],
        ['8G', '2V', '3J', '9B', '6P', '4M', '7R', '5T', '1O'],
        ['', '', '', '', '', '', '9G', '', ''],
        ['', '', '', '', '', '', '8B', '', '']
    ],
    2: [
        ['', '', '', '', '4T', '', '', '', ''],
        ['', '', '', '', '', '', '4G', '', ''],
        ['', '', '4M', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '4R'],
        ['4V', '', '', '', '', '', '', '', ''],
        ['', '', '', '4O', '', '', '', '', ''],
        ['', '', '', '', '', '4B', '', '', ''],
        ['', '4P', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '4J', '']
    ],
    3: [
        ['3G', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '4G', '', ''],
        ['', '', '', '5G', '', '', '', '', ''],
        ['', '', '8G', '', '', '', '', '', ''],
        ['', '', '', '', '', '9G', '', '', ''],
        ['', '', '', '', '', '', '', '7G', ''],
        ['2G', '', '', '', '', '', '', '', ''],
        ['', '1G', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '6G']
    ],
    4: [
        ['3G', '', '', '', '4T', '', '', '', ''],
        ['', '', '', '', '', '', '4G', '', ''],
        ['', '', '4M', '5G', '', '', '', '', ''],
        ['', '', '8G', '', '', '', '', '', '4R'],
        ['4V', '', '', '', '', '9G', '', '', ''],
        ['', '', '', '4O', '', '', '', '7G', ''],
        ['2G', '', '', '', '', '4B', '', '', ''],
        ['', '4P', '', '', '', '', '', '', ''],
        ['', '1G', '', '', '', '', '', '4J', '6G']
    ],
    5: [
        ['3V', '5B', '2G', '6M', '4R', '7P', '1T', '9O', '8J'],
        ['1P', '7J', '9R', '2O', '3B', '8T', '4V', '6G', '5M'],
        ['6O', '8M', '4T', '5V', '9J', '1G', '2P', '3R', '7B'],
        ['2J', '9P', '8V', '3T', '7M', '6R', '5O', '1B', '4G'],
        ['4B', '6T', '7O', '1J', '5G', '9V', '3M', '8P', '2R'],
        ['5R', '3G', '1M', '4P', '8O', '2B', '6J', '7V', '9T'],
        ['8G', '2V', '3J', '9B', '6P', '4M', '7R', '5T', '1O'],
        ['7T', '4O', '6B', '8R', '1V', '5J', '9G', '2M', '3P'],
        ['9M', '1R', '5P', '7G', '2T', '3O', '8B', '4J', '6V']
    ]
};

function createGrid(gridId, data) {
    const gridElement = document.getElementById(gridId);
    gridElement.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'mini-cell';
            
            // Set default background color
            cell.style.backgroundColor = '#E6F0FF';
            
            const value = data[row][col];
            if (value) {
                const number = value.match(/\d/)?.[0];
                const color = value.match(/[A-Z]/)?.[0];
                
                // Add highlighting for specific steps
                if (gridId === 'grid-4' && row === 1 && col === 6) {
                    cell.classList.add('rainbow-highlight');
                    cell.style.cursor = 'pointer';
                    cell.dataset.clickMode = '0';
                    cell.addEventListener('click', () => toggleCellHighlight(cell, row, col, gridId));
                }
                
                // Set content and final styling immediately
                if (number) {
                    cell.textContent = number;
                    cell.classList.add('hint');
                }
                
                if (color && colorMap[color]) {
                    cell.style.backgroundColor = colorMap[color];
                }
            }
            
            gridElement.appendChild(cell);
        }
    }
}

function toggleCellHighlight(cell, row, col, gridId) {
    if (gridId !== 'grid-4' || row !== 1 || col !== 6) return;
    
    const currentMode = parseInt(cell.dataset.clickMode || '0');
    const nextMode = (currentMode + 1) % 4;
    cell.dataset.clickMode = nextMode.toString();
    
    // Clear all highlights first
    const allCells = document.querySelectorAll(`#${gridId} .mini-cell`);
    allCells.forEach(c => {
        c.classList.remove('rainbow-highlight', 'chromatic-highlight', 'highlight', 'dimmed');
        c.style.opacity = '1';
        c.style.boxShadow = '';
    });
    
    // Apply new highlights based on mode
    switch (nextMode) {
        case 0: // No highlight
            cell.classList.remove('rainbow-highlight', 'chromatic-highlight');
            break;
        case 1: // Rainbow mode (highlight all 4s)
            cell.classList.add('rainbow-highlight');
            allCells.forEach((c, index) => {
                const cellRow = Math.floor(index / 9);
                const cellCol = index % 9;
                const cellValue = grids[4][cellRow][cellCol];
                if (cellValue && cellValue.includes('4')) {
                    if (c !== cell) {
                        c.classList.add('highlight');
                    }
                } else {
                    c.classList.add('dimmed');
                    c.style.opacity = '0.3';
                    c.style.boxShadow = 'inset 0 4px 8px rgba(0,0,0,0.5)';
                }
            });
            break;
        case 2: // Chromatic mode (highlight all green)
            cell.classList.add('chromatic-highlight');
            allCells.forEach((c, index) => {
                const cellRow = Math.floor(index / 9);
                const cellCol = index % 9;
                const cellValue = grids[4][cellRow][cellCol];
                if (cellValue && cellValue.includes('G')) {
                    if (c !== cell) {
                        c.classList.add('highlight');
                    }
                } else {
                    c.classList.add('dimmed');
                    c.style.opacity = '0.3';
                    c.style.boxShadow = 'inset 0 4px 8px rgba(0,0,0,0.5)';
                }
            });
            break;
        case 3: // Line/Column mode
            cell.classList.add('rainbow-highlight');
            allCells.forEach((c, index) => {
                const cellRow = Math.floor(index / 9);
                const cellCol = index % 9;
                if (cellRow === row || cellCol === col) {
                    if (c !== cell) {
                        c.classList.add('highlight');
                    }
                } else {
                    c.classList.add('dimmed');
                    c.style.opacity = '0.3';
                    c.style.boxShadow = 'inset 0 4px 8px rgba(0,0,0,0.5)';
                }
            });
            break;
    }
}

function updateStep() {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    document.getElementById(`step-${currentStep}`).classList.add('active');
    
    // Update step indicator
    document.getElementById('step-number').textContent = currentStep;
    document.querySelectorAll('.step-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index < currentStep);
    });
    
    // Update buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    prevBtn.disabled = currentStep === 1;
    
    if (currentStep === totalSteps) {
        nextBtn.textContent = 'Start Playing';
        nextBtn.className = 'nav-tutorial-btn finish-btn';
        nextBtn.onclick = startPlaying;
    } else {
        nextBtn.textContent = 'Next';
        nextBtn.className = 'nav-tutorial-btn next-btn';
        nextBtn.onclick = nextStep;
    }
}

function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateStep();
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStep();
    }
}

function startPlaying() {
    window.location.href = '../';
}

function navigateTo(page) {
    switch(page) {
        case 'tutorial':
            // Already on tutorial page, do nothing
            break;
        case 'leaderboard':
            window.location.href = '../leaderboard/';
            break;
        case 'auth':
            window.location.href = '../auth/';
            break;
        case 'legal':
            window.location.href = '../legal/';
            break;
        default:
            console.log('Navigate to:', page);
    }
}

function goToHome() {
    window.location.href = '../';
}

// Initialize all grids when page loads
document.addEventListener('DOMContentLoaded', function() {
    for (let i = 1; i <= 5; i++) {
        createGrid(`grid-${i}`, grids[i]);
    }
});