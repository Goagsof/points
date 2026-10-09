// Datos de las operaciones - AHORA CON DI, MODELING Y QC
// Los datos se organizan por departamento
const departmentOperations = {
    di: {
        name: "DI",
        operations: [
            { type: "DI", description: "Unbonded therapeutic initial", points: 0.044 },
            { type: "DI", description: "Unbonded therapeutic CT suppl", points: 0.145 },
            { type: "DI", description: "Unbonded therapeutic init CT suppl", points: 0.207 },
            { type: "DI", description: "unbonded therapeutic update", points: 0.047 },
            { type: "DI", description: "Retainer stand-alone model", points: 0.05 },
            { type: "DI", description: "Diagonstic model stl", points: 0.048 },
            { type: "DI", description: "Therapeutic initial 3rd party", points: 0.11 },
            { type: "DI", description: "Therapeutic update 3rd party", points: 0.12 },
            { type: "DI", description: "Therapeutic update Ling 3rd party", points: 0.13 }
        ],
        hasPTS: false
    },
    modeling: {
        name: "Modeling",
        operations: [
            { type: "Modeling", description: "Unbonded", points: 0.25 },
            { type: "Modeling", description: "Diagnostics", points: 0.15 },
            { type: "Modeling", description: "Retainers SA", points: 0.25 },
            { type: "Modeling", description: "Therapeutic", points: 0.333 },
            { type: "Modeling", description: "CT's", points: 0.3 },
            { type: "Modeling", description: "CT's Suppl", points: 0.417 },
            { type: "Modeling", description: "CT's Diag", points: 0.208 },
            { type: "Modeling", description: "CT's Diag Suppl", points: 0.244 }
        ],
        ptsOperations: [
            { type: "PTS", description: "Diagnostics", points: 0.083 },
            { type: "PTS", description: "Retainers SA", points: 0.12 },
            { type: "PTS", description: "Unbonded", points: 0.133 },
            { type: "PTS", description: "Therapeutic", points: 0.133 },
            { type: "PTS", description: "CT's / Suppl", points: 0.133 },
            { type: "PTS", description: "Unbonded Suppl", points: 0.164 }
        ],
        hasPTS: true
    },
    qc: {
        name: "QC",
        operations: [
            { type: "QC", description: "Unbonded therapeutic initial", points: 0.035 },
            { type: "QC", description: "Unbonded therapeutic CT suppl", points: 0 },
            { type: "QC", description: "Unbonded therapeutic init CT suppl", points: 0 },
            { type: "QC", description: "unbonded therapeutic update", points: 0.035 },
            { type: "QC", description: "Retainer stand-alone model", points: 0 },
            { type: "QC", description: "Diagonstic model stl", points: 0.018 },
            { type: "QC", description: "Therapeutic initial 3rd party", points: 0.035 },
            { type: "QC", description: "Therapeutic update 3rd party", points: 0.035 },
            { type: "QC", description: "Therapeutic update Ling 3rd party", points: 0.035 }
        ],
        hasPTS: false
    }
};

// Departamento actual (modeling por defecto)
let currentDepartment = 'modeling';

// Umbral de calidad (la empresa lo subió a 83%)
const QUALITY_THRESHOLD = 83;

// Estado de la aplicación - AHORA CON SOPORTE MULTI-DEPARTAMENTO
let state = {
    // Totales generales (acumulan TODOS los departamentos)
    modelingTotal: 0,    // Total de Modeling (solo operaciones Modeling)
    ptsTotal: 0,         // Total de PTS (solo PTS)
    grandTotal: 0,       // Total general = modelingTotal + ptsTotal + downtime
    
    // NUEVO: Tiempo muerto (0-8 puntos)
    downtime: 0,
    
    // Datos de Modeling para calidad
    modelingCases: 0,
    reworkCases: 0,
    qualityPercentage: 100,
    reworkCodes: new Set(),
    
    // Historial por departamento
    history: [],         // Historial completo con campo 'department'
    caseCodes: new Set(),
    caseNotes: new Map(),
    reworkWithoutCode: 0
};

// Variables temporales para el flujo de nuevo caso
let currentCaseType = null;
let currentOperation = null;

// Elementos del DOM
const modelingButtonsContainer = document.getElementById('modeling-buttons');
const ptsButtonsContainer = document.getElementById('pts-buttons');
const modelingTotalElement = document.getElementById('modeling-total');
const ptsTotalElement = document.getElementById('pts-total');
const grandTotalElement = document.getElementById('grand-total');
const historyListElement = document.getElementById('history-list');
const undoButton = document.getElementById('undo-btn');
const reworkButton = document.getElementById('rework-btn');
const printButton = document.getElementById('print-btn');
const resetButton = document.getElementById('reset-btn');
const qualityPercentageElement = document.getElementById('quality-percentage');

// NUEVO: Elementos del slider de tiempo muerto
const downtimeSlider = document.getElementById('downtime-slider');
const downtimeValueElement = document.getElementById('downtime-value');
const resetDowntimeBtn = document.getElementById('reset-downtime-btn');

// Elementos de modales
const codeModal = document.getElementById('code-modal');
const reworkModal = document.getElementById('rework-modal');
const notesModal = document.getElementById('notes-modal');
const caseCodeInput = document.getElementById('case-code');
const confirmCodeBtn = document.getElementById('confirm-code-btn');
const cancelCodeBtn = document.getElementById('cancel-code-btn');
const omitCodeBtn = document.getElementById('omit-code-btn');
const codeModalTitle = document.getElementById('code-modal-title');
const reworkCodeInput = document.getElementById('rework-code');
const confirmReworkBtn = document.getElementById('confirm-rework-btn');
const omitReworkBtn = document.getElementById('omit-rework-btn');
const cancelReworkBtn = document.getElementById('cancel-rework-btn');
const notesTextarea = document.getElementById('notes-text');
const saveNotesBtn = document.getElementById('save-notes-btn');
const cancelNotesBtn = document.getElementById('cancel-notes-btn');
const notesModalTitle = document.getElementById('notes-modal-title');

// Variable para almacenar el caso actual para notas
let currentNoteCaseId = null;

// ========== SISTEMA DE CAMBIO DE FONDO ==========
const backgroundImages = [
    '1.jpg',
    '2.jpg', 
    '3.jpg',
    '4.jpg',
    '5.jpg',
    '6.jpg'
];

let currentBackgroundIndex = 0;

function loadBackgroundIndex() {
    const savedIndex = localStorage.getItem('backgroundIndex');
    if (savedIndex !== null) {
        currentBackgroundIndex = parseInt(savedIndex, 10);
        if (currentBackgroundIndex >= backgroundImages.length) {
            currentBackgroundIndex = 0;
        }
    }
    applyBackground();
}

function saveBackgroundIndex() {
    localStorage.setItem('backgroundIndex', currentBackgroundIndex.toString());
}

function applyBackground() {
    const imageUrl = `img/${backgroundImages[currentBackgroundIndex]}`;
    document.body.style.backgroundImage = `url('${imageUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    
    if (!document.querySelector('.background-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'background-overlay';
        document.body.appendChild(overlay);
    }
}

function nextBackground() {
    currentBackgroundIndex = (currentBackgroundIndex + 1) % backgroundImages.length;
    applyBackground();
    saveBackgroundIndex();
    showBackgroundNotification();
}

function showBackgroundNotification() {
    console.log(`🎃 Fondo cambiado a: ${backgroundImages[currentBackgroundIndex]} 👻`);
}
// ========== FIN SISTEMA DE FONDO ==========

// ========== SISTEMA DE CAMBIO DE DEPARTAMENTO ==========
function switchDepartment(department) {
    currentDepartment = department;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.department === department) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderButtons();
}

// Renderizar botones
function renderButtons() {
    const dept = departmentOperations[currentDepartment];
    const operationsSection = document.querySelector('.operations-section');
    const operationsColumns = document.querySelectorAll('.operations-column');
    
    if (dept.hasPTS) {
        modelingButtonsContainer.innerHTML = '';
        ptsButtonsContainer.innerHTML = '';
        
        if (operationsColumns.length >= 2) {
            operationsColumns[0].querySelector('h2').textContent = '🎃 Modeling';
            operationsColumns[1].querySelector('h2').textContent = '👻 PTS';
            operationsColumns[1].style.display = 'flex';
        }
        
        operationsSection.classList.remove('single-column');
        
        dept.operations.forEach(op => {
            const button = document.createElement('button');
            button.className = 'operation-btn';
            button.textContent = `🎃 ${op.description} (${op.points.toFixed(3)})`;
            button.addEventListener('click', () => {
                currentCaseType = 'Modeling';
                currentOperation = op;
                showCodeInput();
            });
            modelingButtonsContainer.appendChild(button);
        });
        
        dept.ptsOperations.forEach(op => {
            const button = document.createElement('button');
            button.className = 'operation-btn pts-btn';
            button.textContent = `👻 ${op.description} (${op.points.toFixed(3)})`;
            button.addEventListener('click', () => {
                currentCaseType = 'PTS';
                currentOperation = op;
                showCodeInput();
            });
            ptsButtonsContainer.appendChild(button);
        });
    } else {
        modelingButtonsContainer.innerHTML = '';
        ptsButtonsContainer.innerHTML = '';
        
        if (operationsColumns.length >= 1) {
            const deptEmoji = currentDepartment === 'di' ? '🕷️' : '👻';
            operationsColumns[0].querySelector('h2').textContent = `${deptEmoji} ${dept.name}`;
        }
        
        if (operationsColumns.length >= 2) {
            operationsColumns[1].style.display = 'none';
        }
        
        operationsSection.classList.add('single-column');
        
        const deptEmoji = currentDepartment === 'di' ? '🕷️' : '👻';
        
        dept.operations.forEach(op => {
            const button = document.createElement('button');
            button.className = 'operation-btn';
            button.textContent = `${deptEmoji} ${op.description} (${op.points.toFixed(3)})`;
            button.addEventListener('click', () => {
                currentCaseType = dept.name;
                currentOperation = op;
                showCodeInput();
            });
            modelingButtonsContainer.appendChild(button);
        });
    }
}

function showCodeInput() {
    codeModalTitle.textContent = `🎃 Ingresar código para ${currentOperation.description}`;
    codeModal.style.display = 'block';
    caseCodeInput.value = '';
    caseCodeInput.focus();
}

function closeCodeModal() {
    codeModal.style.display = 'none';
    currentCaseType = null;
    currentOperation = null;
}

function omitCaseCode() {
    let autoCode;
    let counter = 1;
    do {
        autoCode = `AUTO-${counter}`;
        counter++;
    } while (state.caseCodes.has(autoCode));
    
    addOperation(currentOperation, autoCode);
    closeCodeModal();
}

function confirmCaseCode() {
    const code = caseCodeInput.value.trim();
    
    if (code.length === 0 || code.length > 10) {
        alert('Por favor ingresa un código válido (máximo 10 caracteres)');
        return;
    }
    
    if (state.caseCodes.has(code)) {
        alert('Este código ya ha sido utilizado. Por favor usa un código diferente.');
        return;
    }
    
    addOperation(currentOperation, code);
    closeCodeModal();
}

function showReworkModal() {
    if (state.modelingCases === 0) {
        alert("No hay casos de Modeling para marcar como rework.");
        return;
    }
    
    reworkModal.style.display = 'block';
    reworkCodeInput.value = '';
    reworkCodeInput.focus();
}

function closeReworkModal() {
    reworkModal.style.display = 'none';
    reworkCodeInput.value = '';
}

function confirmRework() {
    const code = reworkCodeInput.value.trim();
    const reworkType = document.querySelector('input[name="rework-type"]:checked').value;
    
    if (code.length === 0 || code.length > 10) {
        alert('Por favor ingresa un código válido (máximo 10 caracteres)');
        return;
    }
    
    if (code) {
        const caseExists = state.history.some(item => item.code === code && item.type === 'Modeling');
        
        if (!caseExists) {
            alert('El código ingresado no corresponde a ningún caso de Modeling existente. Si es un caso nuevo, usa "Sin Código".');
            return;
        }
        
        addRework(code, reworkType);
    } else {
        omitReworkCode();
    }
    
    closeReworkModal();
}

function omitReworkCode() {
    const reworkType = document.querySelector('input[name="rework-type"]:checked').value;
    const autoCode = `RW-NOCODE-${state.reworkWithoutCode + 1}`;
    
    addRework(autoCode, reworkType);
    state.reworkWithoutCode++;
    
    closeReworkModal();
}

function showNotesModal(caseId) {
    currentNoteCaseId = caseId;
    const caseItem = state.history.find(item => item.id === caseId);
    
    if (caseItem) {
        notesModalTitle.textContent = `📝 Notas para caso: ${caseItem.code} 🕸️`;
        notesTextarea.value = state.caseNotes.get(caseId) || '';
        notesModal.style.display = 'block';
        notesTextarea.focus();
    }
}

function closeNotesModal() {
    notesModal.style.display = 'none';
    currentNoteCaseId = null;
}

function saveNotes() {
    if (currentNoteCaseId) {
        state.caseNotes.set(currentNoteCaseId, notesTextarea.value.trim());
        saveState();
        updateUI();
    }
    closeNotesModal();
}

// Agregar una operación
function addOperation(operation, code) {
    const caseItem = {
        ...operation,
        id: Date.now() + Math.random(),
        code: code,
        timestamp: new Date().toLocaleString(),
        department: currentDepartment,
        isRework: false
    };
    
    state.history.push(caseItem);
    state.caseCodes.add(code);
    
    if (operation.type === "Modeling") {
        state.modelingTotal += operation.points;
        state.modelingCases++;
        calculateQuality();
    } else if (operation.type === "PTS") {
        state.ptsTotal += operation.points;
    } else {
        state.modelingTotal += operation.points;
    }
    
    updateGrandTotal();
    
    saveState();
    updateUI();
}

// NUEVO: recalcular total general incluyendo tiempo muerto
function updateGrandTotal() {
    state.grandTotal = state.modelingTotal + state.ptsTotal + (Number(state.downtime) || 0);
}

// Agregar un rework
function addRework(code, reworkType) {
    const isExistingRework = (reworkType === 'repetido');
    
    if (isExistingRework) {
        state.qualityPercentage = Math.max(0, state.qualityPercentage - 0.10);
        console.log(`Rework REPETIDO para código ${code}: -0.10% (selección manual)`);
    } else {
        if (!state.reworkCodes.has(code)) {
            state.reworkCases++;
            state.reworkCodes.add(code);
        }
        calculateQuality();
        console.log(`Rework NUEVO para código ${code}: recalcula calidad (selección manual)`);
    }
    
    const caseItem = state.history.find(item => item.code === code && item.type === 'Modeling');
    if (caseItem) {
        caseItem.isRework = true;
        caseItem.reworkTimestamp = new Date().toLocaleString();
        caseItem.reworkType = reworkType;
    } else {
        const reworkItem = {
            type: "Modeling",
            description: "🧟 Rework sin caso original",
            points: 0,
            id: Date.now() + Math.random(),
            code: code,
            timestamp: new Date().toLocaleString(),
            isRework: true,
            reworkTimestamp: new Date().toLocaleString(),
            isReworkOnly: true,
            reworkType: reworkType,
            department: 'modeling'
        };
        
        state.history.push(reworkItem);
        state.caseCodes.add(code);
    }
    
    saveState();
    updateUI();
}

// Eliminar una operación específica
function removeOperation(operationId) {
    const operationIndex = state.history.findIndex(op => op.id === operationId);
    
    if (operationIndex === -1) return;
    
    const operation = state.history[operationIndex];
    
    if (operation.isReworkOnly) {
        state.history.splice(operationIndex, 1);
        state.caseCodes.delete(operation.code);
        state.caseNotes.delete(operation.id);
        state.reworkCodes.delete(operation.code);
        
        if (operation.reworkType === 'nuevo') {
            state.reworkCases = Math.max(0, state.reworkCases - 1);
            calculateQuality();
        } else if (operation.reworkType === 'repetido') {
            state.qualityPercentage = Math.min(100, state.qualityPercentage + 0.10);
        }
        
        console.log(`Eliminado rework ${operation.reworkType}: ${operation.code}`);
    } else {
        state.history.splice(operationIndex, 1);
        state.caseCodes.delete(operation.code);
        state.caseNotes.delete(operation.id);
        
        if (operation.isRework && operation.type === 'Modeling') {
            state.reworkCodes.delete(operation.code);
            
            if (operation.reworkType === 'nuevo') {
                state.reworkCases = Math.max(0, state.reworkCases - 1);
                calculateQuality();
            } else if (operation.reworkType === 'repetido') {
                state.qualityPercentage = Math.min(100, state.qualityPercentage + 0.10);
            }
            
            console.log(`Eliminado rework ${operation.reworkType} del caso: ${operation.code}`);
        }
        
        if (operation.type === "Modeling") {
            state.modelingTotal -= operation.points;
            state.modelingCases--;
            
            if (!(operation.isRework && operation.reworkType === 'repetido')) {
                calculateQuality();
            }
        } else if (operation.type === "PTS") {
            state.ptsTotal -= operation.points;
        } else {
            state.modelingTotal -= operation.points;
        }
        
        updateGrandTotal();
    }
    
    saveState();
    updateUI();
}

// Calcular calidad
function calculateQuality() {
    const modelingCases = Number(state.modelingCases) || 0;
    const reworkCases = Number(state.reworkCases) || 0;
    
    if (modelingCases === 0) {
        state.qualityPercentage = 100;
    } else {
        const approvedCases = modelingCases - reworkCases;
        state.qualityPercentage = Math.max(0, (approvedCases / modelingCases) * 100);
    }
}

// Deshacer última operación
function undoLastOperation() {
    if (state.history.length === 0) return;
    
    const lastOperation = state.history.pop();
    
    state.caseCodes.delete(lastOperation.code);
    state.caseNotes.delete(lastOperation.id);
    
    if (lastOperation.isRework && lastOperation.type === 'Modeling') {
        state.reworkCodes.delete(lastOperation.code);
        
        if (lastOperation.reworkType === 'nuevo') {
            state.reworkCases = Math.max(0, state.reworkCases - 1);
        } else if (lastOperation.reworkType === 'repetido') {
            state.qualityPercentage = Math.min(100, state.qualityPercentage + 0.10);
        }
    }
    
    if (lastOperation.isReworkOnly) {
        state.reworkCodes.delete(lastOperation.code);
        
        if (lastOperation.reworkType === 'nuevo') {
            state.reworkCases = Math.max(0, state.reworkCases - 1);
        } else if (lastOperation.reworkType === 'repetido') {
            state.qualityPercentage = Math.min(100, state.qualityPercentage + 0.10);
        }
    } else {
        if (lastOperation.type === "Modeling") {
            state.modelingTotal -= lastOperation.points;
            state.modelingCases--;
        } else if (lastOperation.type === "PTS") {
            state.ptsTotal -= lastOperation.points;
        } else {
            state.modelingTotal -= lastOperation.points;
        }
        
        updateGrandTotal();
    }
    
    if (!(lastOperation.isRework && lastOperation.reworkType === 'repetido') && 
        !(lastOperation.isReworkOnly && lastOperation.reworkType === 'repetido')) {
        calculateQuality();
    }
    
    saveState();
    updateUI();
}

// Reiniciar aplicación
function resetApplication() {
    if (confirm("¿Estás seguro de que quieres reiniciar el contador? Se perderán todos los datos.")) {
        resetState();
        saveState();
        updateUI();
    }
}

// Función para resetear estado
function resetState() {
    state = {
        history: [],
        modelingTotal: 0,
        ptsTotal: 0,
        grandTotal: 0,
        downtime: 0,
        modelingCases: 0,
        reworkCases: 0,
        qualityPercentage: 100,
        caseCodes: new Set(),
        reworkCodes: new Set(),
        caseNotes: new Map(),
        reworkWithoutCode: 0
    };
}

// Guardar estado en localStorage
function saveState() {
    const stateToSave = {
        ...state,
        caseCodes: Array.from(state.caseCodes),
        reworkCodes: Array.from(state.reworkCodes),
        caseNotes: Array.from(state.caseNotes.entries())
    };
    localStorage.setItem('pointsCounterState', JSON.stringify(stateToSave));
}

// Cargar estado desde localStorage
function loadState() {
    const savedState = localStorage.getItem('pointsCounterState');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            state.history = parsed.history || [];
            state.modelingTotal = Number(parsed.modelingTotal) || 0;
            state.ptsTotal = Number(parsed.ptsTotal) || 0;
            state.grandTotal = Number(parsed.grandTotal) || 0;
            state.downtime = Number(parsed.downtime) || 0;
            state.modelingCases = Number(parsed.modelingCases) || 0;
            state.reworkCases = Number(parsed.reworkCases) || 0;
            state.qualityPercentage = Number(parsed.qualityPercentage) || 100;
            state.caseCodes = new Set(parsed.caseCodes || []);
            state.reworkCodes = new Set(parsed.reworkCodes || []);
            state.caseNotes = new Map(parsed.caseNotes || []);
            state.reworkWithoutCode = Number(parsed.reworkWithoutCode) || 0;
        } catch (e) {
            console.error("Error loading state:", e);
            resetState();
        }
    }
}

// Imprimir a PDF
function printToPDF() {
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>🎃 Reporte de Puntos - ${getCurrentDate()} 👻</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { display: flex; justify-content: space-around; margin-bottom: 20px; flex-wrap: wrap; }
                .summary-item { text-align: center; padding: 15px; min-width: 120px; }
                .summary-value { font-size: 24px; font-weight: bold; }
                .cases-summary { margin: 20px 0; }
                .cases-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                .case-item { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
                .history { margin-top: 20px; }
                .history-item { padding: 12px; border-bottom: 1px solid #eee; margin-bottom: 10px; }
                .rework-item { background-color: #ffeaea; border-left: 4px solid #e74c3c; }
                .case-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
                .case-details { margin-bottom: 5px; }
                .case-notes { margin-top: 8px; padding: 8px; background-color: #f8f9fa; border-left: 3px solid #3498db; font-style: italic; border-radius: 3px; }
                .rework-badge { color: #e74c3c; font-weight: bold; margin-top: 5px; }
                .department-badge { display: inline-block; background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px; }
                @media print { 
                    body { margin: 10px; }
                    .summary-item { padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎃 Reporte de Puntos 👻</h1>
                <p>📅 Fecha: ${getCurrentDate()}</p>
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <div class="summary-value">${state.modelingTotal.toFixed(3)}</div>
                    <div>🎃 Total Modeling + DI + QC</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${state.ptsTotal.toFixed(3)}</div>
                    <div>👻 Total PTS</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${(Number(state.downtime) || 0).toFixed(3)}</div>
                    <div>💀 Tiempo Muerto</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${state.grandTotal.toFixed(3)}</div>
                    <div>🕷️ Total General</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: ${state.qualityPercentage >= QUALITY_THRESHOLD ? '#27ae60' : '#e74c3c'}">
                        ${state.qualityPercentage.toFixed(2)}%
                    </div>
                    <div>⚰️ Calidad Modeling (min. ${QUALITY_THRESHOLD}%)</div>
                </div>
            </div>
            
            <div class="cases-summary">
                <h3>🕸️ Resumen de Casos</h3>
                <div class="cases-grid">
                    <div class="case-item">
                        <div class="summary-value">${state.modelingCases}</div>
                        <div>🎃 Casos Modeling</div>
                    </div>
                    <div class="case-item">
                        <div class="summary-value">${getPTSCasesCount()}</div>
                        <div>👻 Casos PTS</div>
                    </div>
                    <div class="case-item">
                        <div class="summary-value">${state.history.length}</div>
                        <div>🦇 Total Casos</div>
                    </div>
                </div>
            </div>
            
            <div class="history">
                <h3>📜 Detalle de Casos (${state.history.length} casos)</h3>
                ${generateHistoryHTML()}
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.print();
        setTimeout(() => {
            printWindow.close();
        }, 100);
    };
}

function getCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
}

function getPTSCasesCount() {
    return state.history.filter(item => item.type === 'PTS').length;
}

function generateHistoryHTML() {
    if (state.history.length === 0) {
        return '<p>🕸️ No hay casos registrados 🕸️</p>';
    }
    
    let html = '';
    const sortedHistory = [...state.history].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    sortedHistory.forEach(item => {
        const hasNotes = state.caseNotes.has(item.id);
        const notes = hasNotes ? state.caseNotes.get(item.id) : '';
        const deptName = item.department ? item.department.toUpperCase() : (item.type === 'PTS' ? 'PTS' : item.type);
        
        html += `
            <div class="history-item ${item.isRework ? 'rework-item' : ''}">
                <div class="case-header">
                    <div>
                        <strong>🎃 ${item.code}</strong> - ${item.type || deptName}
                        <span class="department-badge">${deptName}</span>
                    </div>
                    ${item.points > 0 ? `<div>💎 ${item.points.toFixed(3)} puntos</div>` : '<div>🧟 Rework</div>'}
                </div>
                <div class="case-details">
                    <div><strong>⚙️ Operación:</strong> ${item.description}</div>
                    <div><strong>📅 Fecha:</strong> ${item.timestamp}</div>
                </div>
                ${item.isRework ? `
                    <div class="rework-badge">⚠️ CASO REWORK (${item.reworkType || 'nuevo'})</div>
                ` : ''}
                ${hasNotes ? `
                    <div class="case-notes">
                        <strong>📝 Notas:</strong> ${notes}
                    </div>
                ` : ''}
            </div>
        `;
    });
    return html;
}

// Actualizar la interfaz de usuario
function updateUI() {
    // Actualizar totales
    modelingTotalElement.textContent = state.modelingTotal.toFixed(3);
    ptsTotalElement.textContent = state.ptsTotal.toFixed(3);
    
    // Recalcular grand total incluyendo downtime
    updateGrandTotal();
    grandTotalElement.textContent = state.grandTotal.toFixed(3);
    
    // Actualizar slider de tiempo muerto (por si viene de localStorage)
    if (downtimeSlider) {
        downtimeSlider.value = state.downtime;
    }
    if (downtimeValueElement) {
        downtimeValueElement.textContent = state.downtime;
    }
    
    // Actualizar calidad con validación
    const qualityValue = Number(state.qualityPercentage);
    if (isNaN(qualityValue)) {
        qualityPercentageElement.textContent = "100%";
        state.qualityPercentage = 100;
    } else {
        qualityPercentageElement.textContent = `${qualityValue.toFixed(2)}%`;
    }
    
    // Aplicar color según la calidad (NUEVO UMBRAL: 83%)
    if (state.qualityPercentage >= QUALITY_THRESHOLD) {
        qualityPercentageElement.className = "quality-value good-quality";
    } else {
        qualityPercentageElement.className = "quality-value poor-quality";
    }
    
    // Actualizar historial
    historyListElement.innerHTML = '';
    
    const filteredHistory = state.history.filter(item => {
        if (currentDepartment === 'modeling') {
            return item.type === 'Modeling' || item.type === 'PTS';
        } else {
            return item.department === currentDepartment;
        }
    });
    
    if (filteredHistory.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'history-item';
        emptyMessage.textContent = '🕸️ No hay casos registrados en este departamento 🕸️';
        historyListElement.appendChild(emptyMessage);
    } else {
        const sortedHistory = [...filteredHistory].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        sortedHistory.forEach((op) => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${op.isRework ? 'rework' : ''}`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'history-item-content';
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'case-header';
            
            const codeSpan = document.createElement('span');
            codeSpan.className = 'case-code';
            codeSpan.textContent = `🎃 Código: ${op.code}`;
            
            const pointsSpan = document.createElement('span');
            pointsSpan.className = 'case-points';
            if (op.points > 0) {
                pointsSpan.textContent = `💎 ${op.points.toFixed(3)} pts`;
            } else {
                pointsSpan.textContent = '🧟 Rework';
            }
            
            headerDiv.appendChild(codeSpan);
            headerDiv.appendChild(pointsSpan);
            
            const descriptionSpan = document.createElement('div');
            descriptionSpan.className = 'case-description';
            descriptionSpan.textContent = `${op.type}: ${op.description}`;
            
            const timestampSpan = document.createElement('div');
            timestampSpan.className = 'case-timestamp';
            timestampSpan.textContent = `📅 Fecha: ${op.timestamp}`;
            
            contentDiv.appendChild(headerDiv);
            contentDiv.appendChild(descriptionSpan);
            contentDiv.appendChild(timestampSpan);
            
            if (state.caseNotes.has(op.id)) {
                const noteSpan = document.createElement('div');
                noteSpan.className = 'case-note-preview';
                const noteText = state.caseNotes.get(op.id);
                noteSpan.textContent = `📝 ${noteText.substring(0, 50)}${noteText.length > 50 ? '...' : ''}`;
                noteSpan.title = noteText;
                contentDiv.appendChild(noteSpan);
            }
            
            if (op.isRework) {
                const reworkSpan = document.createElement('div');
                reworkSpan.className = 'case-rework';
                const reworkType = op.reworkType === 'repetido' ? ' (Repetido: -0.10%)' : ' (Nuevo: -1 caso)';
                reworkSpan.textContent = `🧟 Rework${reworkType}`;
                contentDiv.appendChild(reworkSpan);
            }
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-item-actions';
            
            const notesButton = document.createElement('button');
            notesButton.className = 'notes-btn';
            notesButton.innerHTML = '<svg viewBox="0 0 24 24" class="svgIcon" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>';
            notesButton.addEventListener('click', () => showNotesModal(op.id));

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.innerHTML = '<svg viewBox="0 0 448 512" class="svgIcon" width="14" height="14"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path></svg>';
            deleteButton.addEventListener('click', () => removeOperation(op.id));
            
            actionsDiv.appendChild(notesButton);
            actionsDiv.appendChild(deleteButton);
            
            historyItem.appendChild(contentDiv);
            historyItem.appendChild(actionsDiv);
            historyListElement.appendChild(historyItem);
        });
    }
    
    // Deshabilitar botones según el estado
    undoButton.disabled = filteredHistory.length === 0;
    reworkButton.disabled = currentDepartment !== 'modeling' || state.modelingCases === 0;
}

// NUEVO: Manejar cambio del slider de tiempo muerto
function handleDowntimeChange(event) {
    const value = Number(event.target.value) || 0;
    state.downtime = value;
    
    if (downtimeValueElement) {
        downtimeValueElement.textContent = value;
    }
    
    updateGrandTotal();
    grandTotalElement.textContent = state.grandTotal.toFixed(3);
    
    saveState();
}

// NUEVO: Reiniciar solo el tiempo muerto
function resetDowntime() {
    if (state.downtime === 0) return;
    
    if (confirm("¿Reiniciar el tiempo muerto a 0?")) {
        state.downtime = 0;
        
        if (downtimeSlider) {
            downtimeSlider.value = 0;
        }
        if (downtimeValueElement) {
            downtimeValueElement.textContent = 0;
        }
        
        updateGrandTotal();
        grandTotalElement.textContent = state.grandTotal.toFixed(3);
        
        saveState();
    }
}

// Inicializar la aplicación
function init() {
    loadState();
    loadBackgroundIndex();
    
    const operationsColumns = document.querySelectorAll('.operations-column');
    if (operationsColumns.length >= 2) {
        operationsColumns[1].style.display = 'flex';
    }
    
    renderButtons();
    updateUI();
    
    // Event listeners principales
    undoButton.addEventListener('click', undoLastOperation);
    reworkButton.addEventListener('click', showReworkModal);
    printButton.addEventListener('click', printToPDF);
    resetButton.addEventListener('click', resetApplication);
    
    // NUEVO: Event listeners del slider de tiempo muerto
    if (downtimeSlider) {
        downtimeSlider.addEventListener('input', handleDowntimeChange);
    }
    if (resetDowntimeBtn) {
        resetDowntimeBtn.addEventListener('click', resetDowntime);
    }
    
    // Event listeners para modales
    confirmCodeBtn.addEventListener('click', confirmCaseCode);
    cancelCodeBtn.addEventListener('click', closeCodeModal);
    omitCodeBtn.addEventListener('click', omitCaseCode);
    confirmReworkBtn.addEventListener('click', confirmRework);
    omitReworkBtn.addEventListener('click', omitReworkCode);
    cancelReworkBtn.addEventListener('click', closeReworkModal);
    saveNotesBtn.addEventListener('click', saveNotes);
    cancelNotesBtn.addEventListener('click', closeNotesModal);
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === codeModal) closeCodeModal();
        if (e.target === reworkModal) closeReworkModal();
        if (e.target === notesModal) closeNotesModal();
    });
    
    const backgroundBtn = document.getElementById('change-background-btn');
    if (backgroundBtn) {
        backgroundBtn.addEventListener('click', nextBackground);
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchDepartment(btn.dataset.department);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);