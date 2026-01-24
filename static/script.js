// ================================
// Configuration
// ================================
const API_ENDPOINT = "/predict";
const ANIMATION_DURATION = 300;

// ================================
// State Management
// ================================
let state = {
    selectedFile: null,
    isAnalyzing: false,
    modelsCount: 0,
    scansCount: 0
};

// ================================
// DOM Elements
// ================================
const elements = {
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    uploadContent: document.getElementById('upload-content'),
    previewState: document.getElementById('preview-state'),
    previewImage: document.getElementById('preview-image'),
    removeBtn: document.getElementById('remove-btn'),
    analyzeBtn: document.getElementById('analyze-btn'),
    loadingState: document.getElementById('loading-state'),
    resultsSection: document.getElementById('results-section'),
    modelsCount: document.getElementById('models-count'),
    scansCount: document.getElementById('scans-count'),

    // Result elements
    overallConfidence: document.getElementById('overall-confidence'),
    confidenceValue: document.getElementById('confidence-value'),
    carModel: document.getElementById('car-model'),
    carYear: document.getElementById('car-year'),
    modelConfidenceFill: document.getElementById('model-confidence-fill'),
    modelConfidenceText: document.getElementById('model-confidence-text'),
    yearConfidenceFill: document.getElementById('year-confidence-fill'),
    yearConfidenceText: document.getElementById('year-confidence-text'),
    specsGrid: document.getElementById('specs-grid'),
    resultCarImage: document.getElementById('result-car-image')
};

// ================================
// Initialization
// ================================
function init() {
    setupEventListeners();
    animateCounters();
    loadStoredStats();
}

function setupEventListeners() {
    // Upload area click
    elements.uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-btn') && !state.isAnalyzing) {
            elements.fileInput.click();
        }
    });

    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Remove button
    elements.removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSelection();
    });

    // Analyze button
    elements.analyzeBtn.addEventListener('click', analyzeImage);

    // Drag and drop
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
}

// ================================
// File Handling
// ================================
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        loadFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadFile(file);
    }
}

function loadFile(file) {
    state.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImage.src = e.target.result;
        showPreview();
    };
    reader.readAsDataURL(file);
}

function showPreview() {
    elements.uploadContent.classList.add('hidden');
    elements.previewState.classList.remove('hidden');
    elements.analyzeBtn.disabled = false;
    elements.resultsSection.classList.add('hidden');
}

function clearSelection() {
    state.selectedFile = null;
    elements.fileInput.value = '';
    elements.previewImage.src = '';
    elements.uploadContent.classList.remove('hidden');
    elements.previewState.classList.add('hidden');
    elements.analyzeBtn.disabled = true;
    elements.resultsSection.classList.add('hidden');
}

// ================================
// API & Analysis
// ================================
async function analyzeImage() {
    if (!state.selectedFile || state.isAnalyzing) return;

    state.isAnalyzing = true;
    elements.analyzeBtn.classList.add('hidden');
    elements.loadingState.classList.remove('hidden');

    const formData = new FormData();
    formData.append('file', state.selectedFile);

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data);
        updateStats();
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to analyze image. The API request to /predict failed.');
    } finally {
        state.isAnalyzing = false;
        elements.loadingState.classList.add('hidden');
        elements.analyzeBtn.classList.remove('hidden');
    }
}

// ================================
// Results Display
// ================================
function displayResults(data) {
    // Format car name
    const carName = formatCarName(data.car);
    const year = data.year;

    // Show result image - use the already loaded preview image
    if (elements.resultCarImage && elements.previewImage) {
        elements.resultCarImage.src = elements.previewImage.src;
    }

    // Calculate overall confidence
    const overallConfidence = ((data.confidence.model + data.confidence.year) / 2 * 100).toFixed(1);

    // Update main info
    elements.carModel.textContent = carName;
    elements.carYear.textContent = year;
    elements.confidenceValue.textContent = `${overallConfidence}%`;

    // Update confidence bars
    updateConfidenceBar(
        elements.modelConfidenceFill,
        elements.modelConfidenceText,
        data.confidence.model
    );

    updateConfidenceBar(
        elements.yearConfidenceFill,
        elements.yearConfidenceText,
        data.confidence.year
    );

    // Update confidence badge color
    updateConfidenceBadge(parseFloat(overallConfidence));

    // Display engine specs
    displayEngineSpecs(data.engine);

    // Show results section with animation
    setTimeout(() => {
        elements.resultsSection.classList.remove('hidden');
        elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
}

function formatCarName(carString) {
    // Convert "Audi_A4_Sedan_2012" to "Audi A4 Sedan"
    return carString.replace(/_/g, ' ')
        .split(' ')
        .filter(word => !/^\d{4}$/.test(word)) // Remove year if present
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function updateConfidenceBar(fillElement, textElement, confidence) {
    const percentage = (confidence * 100).toFixed(1);
    setTimeout(() => {
        fillElement.style.width = `${percentage}%`;
        textElement.textContent = `${percentage}%`;
    }, 100);
}

function updateConfidenceBadge(confidence) {
    const badge = elements.overallConfidence;

    if (confidence >= 80) {
        badge.style.background = 'rgba(16, 185, 129, 0.1)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        badge.style.color = '#10b981';
    } else if (confidence >= 60) {
        badge.style.background = 'rgba(245, 158, 11, 0.1)';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        badge.style.color = '#f59e0b';
    } else {
        badge.style.background = 'rgba(239, 68, 68, 0.1)';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        badge.style.color = '#ef4444';
    }
}

function displayEngineSpecs(engineData) {
    elements.specsGrid.innerHTML = '';

    // Define spec configurations with inline SVGs
    const specConfigs = {
        displacement: {
            name: 'Displacement',
            unit: 'L',
            icon: '<path d="M19 5h-1.42l-2.58-3H9L6.42 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM9 4h6l1.7 2H7.3L9 4z" />'
        },
        displacement_l: {
            name: 'Displacement',
            unit: 'L',
            icon: '<path d="M19 5h-1.42l-2.58-3H9L6.42 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM9 4h6l1.7 2H7.3L9 4z" />'
        },
        bhp: {
            name: 'Power',
            unit: 'BHP',
            icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />'
        },
        torque_nm: {
            name: 'Torque',
            unit: 'Nm',
            icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
        },
        cylinders: {
            name: 'Cylinders',
            unit: '',
            icon: '<path d="M5 3v18"/><path d="M19 3v18"/><path d="M5 9h14"/><path d="M5 15h14"/><path d="M9 3v18"/><path d="M15 3v18"/>'
        },
        aspiration: {
            name: 'Aspiration',
            unit: '',
            icon: '<path d="M12 3a9 9 0 0 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5z"/>'
        },
        gearbox: {
            name: 'Gearbox',
            unit: '',
            icon: '<circle cx="12" cy="12" r="2"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/>'
        },
        fuel: {
            name: 'Fuel Type',
            unit: '',
            icon: '<path d="M3 22v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/><path d="M8 2h8a2 2 0 0 1 2 2v8H6V4a2 2 0 0 1 2-2z"/><path d="M12 12V6"/>'
        },
        top_speed_kmh: {
            name: 'Top Speed',
            unit: 'km/h',
            icon: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/><path d="M12 6v6l4 2"/>'
        },
        max_speed: {
            name: 'Max Speed',
            unit: 'km/h',
            icon: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/><path d="M12 6v6l4 2"/>'
        },
        doors: {
            name: 'Doors',
            unit: '',
            icon: '<rect x="4" y="3" width="16" height="18" rx="2" ry="2"/><path d="M8 12h2"/>'
        },
        seats: {
            name: 'Seats',
            unit: '',
            icon: '<path d="M7 11V7a5 5 0 0 1 10 0v4"/><rect x="3" y="11" width="18" height="10" rx="2"/>'
        },
        acceleration: {
            name: 'Acceleration',
            unit: 's',
            icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
        },
        drive_type: {
            name: 'Drive Type',
            unit: '',
            icon: '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M2.9 8.8L5 14h14l2.1-5.2a2 2 0 0 0-1.8-2.8H4.7a2 2 0 0 0-1.8 2.8z"/>'
        }
    };


    // Create spec cards
    Object.entries(engineData).forEach(([key, spec]) => {
        let config = specConfigs[key] || { name: key, unit: '', icon: '📊' };

        // Handle displacement normalization (cc to L)
        if ((key === 'displacement' || key === 'displacement_l') && typeof spec.value === 'number') {
            // Ensure we use the correct config for displacement
            config = specConfigs['displacement_l'];

            // If value is likely in cc (e.g. 1390), convert to Liters
            if (spec.value > 20) {
                spec.value = spec.value / 1000;
            }
        }

        const card = createSpecCard(config, spec);
        elements.specsGrid.appendChild(card);
    });

    // Animate cards in sequence
    const cards = elements.specsGrid.querySelectorAll('.spec-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

function createSpecCard(config, spec) {
    const card = document.createElement('div');
    card.className = 'spec-card';

    const value = typeof spec.value === 'number'
        ? spec.value.toFixed(1)
        : spec.value;

    const unit = config.unit ? ` ${config.unit}` : '';
    const confidence = (spec.confidence * 100).toFixed(0);

    // Determine icon content (SVG)
    let iconContent;
    if (config.icon.startsWith('<')) {
        // Just wrap it in an SVG tag if it's just paths, or use it as is if it's full SVG
        iconContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${config.icon}</svg>`;
    } else {
        iconContent = config.icon;
    }

    card.innerHTML = `
        <div class="spec-header">
            <div class="spec-icon">${iconContent}</div>
            <div class="spec-name">${config.name}</div>
        </div>
        <div class="spec-value">${value}${unit}</div>
        <div class="spec-source">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2"/>
            </svg>
            ${spec.source || 'Unknown'}
        </div>
        <div class="spec-confidence">
            Confidence: ${confidence}%
            <div class="spec-confidence-bar">
                <div class="spec-confidence-fill" style="width: ${confidence}%"></div>
            </div>
        </div>
    `;

    return card;
}

// ================================
// Stats & Animations
// ================================
function animateCounters() {
    animateCounter(elements.modelsCount, 0, 50, 2000);
    setTimeout(() => {
        animateCounter(elements.scansCount, 0, state.scansCount || 127, 2000);
    }, 500);
}

function animateCounter(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

function updateStats() {
    state.scansCount++;
    saveStats();
    animateCounter(elements.scansCount, state.scansCount - 1, state.scansCount, 500);
}

function saveStats() {
    localStorage.setItem('autoVisionStats', JSON.stringify({
        scansCount: state.scansCount
    }));
}

function loadStoredStats() {
    const stored = localStorage.getItem('autoVisionStats');
    if (stored) {
        const stats = JSON.parse(stored);
        state.scansCount = stats.scansCount || 0;
    }
}

// ================================
// Error Handling
// ================================
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ================================
// Initialize App
// ================================
document.addEventListener('DOMContentLoaded', init);
