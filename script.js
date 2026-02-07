// Datos de las operaciones
const operations = [
    { type: "Modeling", description: "Unbonded", points: 0.25 },
    { type: "Modeling", description: "Diagnostics", points: 0.15 },
    { type: "Modeling", description: "Retainers SA", points: 0.25 },
    { type: "Modeling", description: "Therapeutic", points: 0.333 },
    { type: "Modeling", description: "CT's", points: 0.3 },
    { type: "Modeling", description: "CT's Suppl", points: 0.417 },
    { type: "Modeling", description: "CT's Diag", points: 0.208 },
    { type: "Modeling", description: "CT's Diag Suppl", points: 0.244 },
    { type: "PTS", description: "Diagnostics", points: 0.083 },
    { type: "PTS", description: "Retainers SA", points: 0.12 },
    { type: "PTS", description: "Unbonded", points: 0.133 },
    { type: "PTS", description: "Therapeutic", points: 0.133 },
    { type: "PTS", description: "CT's / Suppl", points: 0.133 },
    { type: "PTS", description: "Unbonded Suppl", points: 0.164 }
];

// Estado de la aplicación
let state = {
    history: [],
    modelingTotal: 0,
    ptsTotal: 0,
    grandTotal: 0,
    modelingCases: 0,
    reworkCases: 0,
    qualityPercentage: 100,
    caseCodes: new Set(), // Para almacenar códigos únicos de casos
    reworkCodes: new Set(), // Para almacenar códigos que han tenido rework
    caseNotes: new Map(), // Para almacenar notas por caso (id -> nota)
    reworkWithoutCode: 0 // Contador de reworks sin código
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

// Cargar el índice de fondo guardado
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

// Guardar el índice de fondo
function saveBackgroundIndex() {
    localStorage.setItem('backgroundIndex', currentBackgroundIndex.toString());
}

// Aplicar el fondo actual
function applyBackground() {
    const imageUrl = `img/${backgroundImages[currentBackgroundIndex]}`;
    document.body.style.backgroundImage = `url('${imageUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    
    // Añadir un overlay oscuro para mejorar legibilidad
    if (!document.querySelector('.background-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'background-overlay';
        document.body.appendChild(overlay);
    }
}

// Cambiar al siguiente fondo
function nextBackground() {
    currentBackgroundIndex = (currentBackgroundIndex + 1) % backgroundImages.length;
    applyBackground();
    saveBackgroundIndex();
    showBackgroundNotification();
}

// Mostrar notificación del fondo actual
function showBackgroundNotification() {
    console.log(`Fondo cambiado a: ${backgroundImages[currentBackgroundIndex]}`);
}
// ========== FIN SISTEMA DE FONDO ==========

// Inicializar la aplicación
function init() {
    loadState();
    loadBackgroundIndex(); 
    renderButtons();
    updateUI();
    
    // Agregar event listeners
    undoButton.addEventListener('click', undoLastOperation);
    reworkButton.addEventListener('click', showReworkModal);
    printButton.addEventListener('click', printToPDF);
    resetButton.addEventListener('click', resetApplication);
    
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
    
    // <-- AÑADIR ESTO: Event listener para el botón de cambio de fondo
    const backgroundBtn = document.getElementById('change-background-btn');
    if (backgroundBtn) {
        backgroundBtn.addEventListener('click', nextBackground);
    }
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

// Función para resetear estado
function resetState() {
    state = {
        history: [],
        modelingTotal: 0,
        ptsTotal: 0,
        grandTotal: 0,
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

// Renderizar botones
function renderButtons() {
    modelingButtonsContainer.innerHTML = '';
    ptsButtonsContainer.innerHTML = '';
    
    operations
        .filter(op => op.type === "Modeling")
        .forEach(op => {
            const button = document.createElement('button');
            button.className = 'operation-btn';
            button.textContent = `${op.description} (${op.points})`;
            button.addEventListener('click', () => {
                currentCaseType = 'Modeling';
                currentOperation = op;
                showCodeInput();
            });
            modelingButtonsContainer.appendChild(button);
        });
    
    operations
        .filter(op => op.type === "PTS")
        .forEach(op => {
            const button = document.createElement('button');
            button.className = 'operation-btn pts-btn';
            button.textContent = `${op.description} (${op.points})`;
            button.addEventListener('click', () => {
                currentCaseType = 'PTS';
                currentOperation = op;
                showCodeInput();
            });
            ptsButtonsContainer.appendChild(button);
        });
}

// Mostrar input de código
function showCodeInput() {
    codeModalTitle.textContent = `Ingresar código para ${currentOperation.description}`;
    codeModal.style.display = 'block';
    caseCodeInput.value = '';
    caseCodeInput.focus();
}

// Cerrar modal de código
function closeCodeModal() {
    codeModal.style.display = 'none';
    currentCaseType = null;
    currentOperation = null;
}

// Omitir código del caso
function omitCaseCode() {
    // Generar un código automático único
    let autoCode;
    let counter = 1;
    do {
        autoCode = `AUTO-${counter}`;
        counter++;
    } while (state.caseCodes.has(autoCode));
    
    // Agregar el caso con código automático
    addOperation(currentOperation, autoCode);
    closeCodeModal();
}

// Confirmar código del caso
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
    
    // Agregar el caso
    addOperation(currentOperation, code);
    closeCodeModal();
}

// Mostrar modal de rework
function showReworkModal() {
    if (state.modelingCases === 0) {
        alert("No hay casos de Modeling para marcar como rework.");
        return;
    }
    
    reworkModal.style.display = 'block';
    reworkCodeInput.value = '';
    reworkCodeInput.focus();
}

// Cerrar modal de rework
function closeReworkModal() {
    reworkModal.style.display = 'none';
    reworkCodeInput.value = '';
}

// Confirmar rework con código
function confirmRework() {
    const code = reworkCodeInput.value.trim();
    const reworkType = document.querySelector('input[name="rework-type"]:checked').value;
    
    if (code.length === 0 || code.length > 10) {
        alert('Por favor ingresa un código válido (máximo 10 caracteres)');
        return;
    }
    
    // Verificar si el código existe (si se ingresó un código específico)
    if (code) {
        const caseExists = state.history.some(item => item.code === code && item.type === 'Modeling');
        
        if (!caseExists) {
            alert('El código ingresado no corresponde a ningún caso de Modeling existente. Si es un caso nuevo, usa "Sin Código".');
            return;
        }
        
        // Agregar rework con código y tipo especificado
        addRework(code, reworkType);
    } else {
        // Si no hay código, usar omitir
        omitReworkCode();
    }
    
    closeReworkModal();
}

// Omitir código para rework
function omitReworkCode() {
    const reworkType = document.querySelector('input[name="rework-type"]:checked').value;
    
    // Generar un código automático para el rework sin código
    const autoCode = `RW-NOCODE-${state.reworkWithoutCode + 1}`;
    
    // Agregar rework con código automático
    addRework(autoCode, reworkType);
    
    // Incrementar contador de reworks sin código
    state.reworkWithoutCode++;
    
    closeReworkModal();
}

// Mostrar modal de notas
function showNotesModal(caseId) {
    currentNoteCaseId = caseId;
    const caseItem = state.history.find(item => item.id === caseId);
    
    if (caseItem) {
        notesModalTitle.textContent = `Notas para caso: ${caseItem.code}`;
        notesTextarea.value = state.caseNotes.get(caseId) || '';
        notesModal.style.display = 'block';
        notesTextarea.focus();
    }
}

// Cerrar modal de notas
function closeNotesModal() {
    notesModal.style.display = 'none';
    currentNoteCaseId = null;
}

// Guardar notas
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
        isRework: false
    };
    
    state.history.push(caseItem);
    state.caseCodes.add(code);
    
    if (operation.type === "Modeling") {
        state.modelingTotal += operation.points;
        state.modelingCases++;
        calculateQuality();
    } else {
        state.ptsTotal += operation.points;
    }
    
    state.grandTotal = state.modelingTotal + state.ptsTotal;
    
    saveState();
    updateUI();
}

// Agregar un rework
function addRework(code, reworkType) {
    // Obtener el tipo de rework del selector
    const isExistingRework = (reworkType === 'repetido');
    
    if (isExistingRework) {
        // Rework REPETIDO según selección del usuario: restar 0.10% de la calidad actual
        state.qualityPercentage = Math.max(0, state.qualityPercentage - 0.10);
        console.log(`Rework REPETIDO para código ${code}: -0.10% (selección manual)`);
    } else {
        // Rework NUEVO según selección del usuario: cálculo proporcional normal
        // Solo sumar a reworkCases si el código no estaba ya registrado
        if (!state.reworkCodes.has(code)) {
            state.reworkCases++;
            state.reworkCodes.add(code);
        }
        calculateQuality();
        console.log(`Rework NUEVO para código ${code}: recalcula calidad (selección manual)`);
    }
    
    // Marcar el caso como rework en el historial (si existe el caso)
    const caseItem = state.history.find(item => item.code === code && item.type === 'Modeling');
    if (caseItem) {
        caseItem.isRework = true;
        caseItem.reworkTimestamp = new Date().toLocaleString();
        caseItem.reworkType = reworkType;
    } else {
        // Si no existe el caso en el historial (rework sin caso original),
        // agregar un registro especial al historial
        const reworkItem = {
            type: "Modeling",
            description: "Rework sin caso original",
            points: 0,
            id: Date.now() + Math.random(),
            code: code,
            timestamp: new Date().toLocaleString(),
            isRework: true,
            reworkTimestamp: new Date().toLocaleString(),
            isReworkOnly: true,
            reworkType: reworkType
        };
        
        state.history.push(reworkItem);
        state.caseCodes.add(code);
    }
    
    saveState();
    updateUI();
}

// Eliminar una operación específica (FUNCIÓN CORREGIDA - BUG FIX)
function removeOperation(operationId) {
    const operationIndex = state.history.findIndex(op => op.id === operationId);
    
    if (operationIndex === -1) return;
    
    const operation = state.history[operationIndex];
    
    // Si es un rework only (RW sin caso original)
    if (operation.isReworkOnly) {
        // Remover del historial
        state.history.splice(operationIndex, 1);
        
        // Remover código
        state.caseCodes.delete(operation.code);
        
        // Remover notas asociadas
        state.caseNotes.delete(operation.id);
        
        // Remover de reworkCodes
        state.reworkCodes.delete(operation.code);
        
        // CORRECCIÓN: Ajustar calidad según el tipo de rework
        if (operation.reworkType === 'nuevo') {
            // Si era rework NUEVO: sumar 1 caso de vuelta
            state.reworkCases = Math.max(0, state.reworkCases - 1);
            calculateQuality(); // Recalcular calidad normalmente
        } else if (operation.reworkType === 'repetido') {
            // Si era rework REPETIDO: sumar 0.10% de vuelta
            state.qualityPercentage = Math.min(100, state.qualityPercentage + 0.10);
        }
        
        console.log(`Eliminado rework ${operation.reworkType}: ${operation.code}`);
    } else {
        // Si es un caso normal (con puntos)
        
        // Remover del historial
        state.history.splice(operationIndex, 1);
        
        // Remover código
        state.caseCodes.delete(operation.code);
        
        // Remover notas asociadas
        state.caseNotes.delete(operation.id);
        
        // Si era rework, actualizar contadores
        if (operation.isRework && operation.type === 'Modeling') {
            // Remover de reworkCodes
            state.reworkCodes.delete(operation.code);
            
            // CORRECCIÓN: Ajustar calidad según el tipo de rework
            if (operation.reworkType === 'nuevo') {
                // Si era rework NUEVO: sumar 1 caso de vuelta
                state.reworkCases = Math.max(0, state.reworkCases - 1);
                calculateQuality(); // Recalcular calidad
            } else if (operation.reworkType === 'repetido') {
                // Si era rework REPETIDO: sumar 0.10% de vuelta
                state.qualityPercentage = Math.min(100, state.qualityPercentage + 0.10);
                // NO llamar a calculateQuality() para no interferir
            }
            
            console.log(`Eliminado rework ${operation.reworkType} del caso: ${operation.code}`);
        }
        
        // Actualizar totales de puntos
        if (operation.type === "Modeling") {
            state.modelingTotal -= operation.points;
            state.modelingCases--;
            
            // Solo recalcular calidad si no era rework repetido
            if (!(operation.isRework && operation.reworkType === 'repetido')) {
                calculateQuality();
            }
        } else {
            state.ptsTotal -= operation.points;
        }
        
        state.grandTotal = state.modelingTotal + state.ptsTotal;
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

// Deshacer última operación (FUNCIÓN CORREGIDA - BUG FIX)
function undoLastOperation() {
    if (state.history.length === 0) return;
    
    const lastOperation = state.history.pop();
    
    // Remover código
    state.caseCodes.delete(lastOperation.code);
    
    // Remover notas asociadas
    state.caseNotes.delete(lastOperation.id);
    
    // Si era rework, actualizar contadores
    if (lastOperation.isRework && lastOperation.type === 'Modeling') {
        state.reworkCodes.delete(lastOperation.code);
        
        // CORRECCIÓN: Ajustar calidad según el tipo de rework
        if (lastOperation.reworkType === 'nuevo') {
            // Si era rework NUEVO: sumar 1 caso de vuelta
            state.reworkCases = Math.max(0, state.reworkCases - 1);
        } else if (lastOperation.reworkType === 'repetido') {
            // Si era rework REPETIDO: sumar 0.10% de vuelta
            state.qualityPercentage = Math.min(100, state.qualityPercentage + 0.10);
        }
    }
    
    // Si era rework only, ajustar calidad
    if (lastOperation.isReworkOnly) {
        state.reworkCodes.delete(lastOperation.code);
        
        // CORRECCIÓN: Ajustar calidad según el tipo de rework
        if (lastOperation.reworkType === 'nuevo') {
            // Si era rework NUEVO: sumar 1 caso de vuelta
            state.reworkCases = Math.max(0, state.reworkCases - 1);
        } else if (lastOperation.reworkType === 'repetido') {
            // Si era rework REPETIDO: sumar 0.10% de vuelta
            state.qualityPercentage = Math.min(100, state.qualityPercentage + 0.10);
        }
    } else {
        // Actualizar totales si era un caso normal
        if (lastOperation.type === "Modeling") {
            state.modelingTotal -= lastOperation.points;
            state.modelingCases--;
        } else {
            state.ptsTotal -= lastOperation.points;
        }
        
        state.grandTotal = state.modelingTotal + state.ptsTotal;
    }
    
    // Recalcular calidad solo si no era rework repetido
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

// Imprimir a PDF
function printToPDF() {
    // Crear contenido HTML para el PDF
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Puntos - ${getCurrentDate()}</title>
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
                @media print { 
                    body { margin: 10px; }
                    .summary-item { padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Reporte de Puntos</h1>
                <p>Fecha: ${getCurrentDate()}</p>
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <div class="summary-value">${state.modelingTotal.toFixed(3)}</div>
                    <div>Total Modeling</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${state.ptsTotal.toFixed(3)}</div>
                    <div>Total PTS</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${state.grandTotal.toFixed(3)}</div>
                    <div>Total General</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" style="color: ${state.qualityPercentage >= 80 ? '#27ae60' : '#e74c3c'}">
                        ${state.qualityPercentage.toFixed(2)}%
                    </div>
                    <div>Calidad</div>
                </div>
            </div>
            
            <div class="cases-summary">
                <h3>Resumen de Casos</h3>
                <div class="cases-grid">
                    <div class="case-item">
                        <div class="summary-value">${state.modelingCases}</div>
                        <div>Casos Modeling</div>
                    </div>
                    <div class="case-item">
                        <div class="summary-value">${getPTSCasesCount()}</div>
                        <div>Casos PTS</div>
                    </div>
                    <div class="case-item">
                        <div class="summary-value">${state.history.length}</div>
                        <div>Total Casos</div>
                    </div>
                </div>
            </div>
            
            <div class="history">
                <h3>Detalle de Casos (${state.history.length} casos)</h3>
                ${generateHistoryHTML()}
            </div>
        </body>
        </html>
    `;
    
    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Esperar a que cargue el contenido y luego imprimir
    printWindow.onload = function() {
        printWindow.print();
        // Cerrar la ventana después de imprimir
        setTimeout(() => {
            printWindow.close();
        }, 100);
    };
}

// Obtener fecha actual en formato DD-MM
function getCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
}

// Obtener contador de casos PTS
function getPTSCasesCount() {
    return state.history.filter(item => item.type === 'PTS').length;
}

// Generar HTML del historial para el PDF
function generateHistoryHTML() {
    if (state.history.length === 0) {
        return '<p>No hay casos registrados</p>';
    }
    
    let html = '';
    // Ordenar por timestamp (más reciente primero)
    const sortedHistory = [...state.history].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    sortedHistory.forEach(item => {
        const hasNotes = state.caseNotes.has(item.id);
        const notes = hasNotes ? state.caseNotes.get(item.id) : '';
        
        html += `
            <div class="history-item ${item.isRework ? 'rework-item' : ''}">
                <div class="case-header">
                    <div><strong>${item.code}</strong> - ${item.type}</div>
                    ${item.points > 0 ? `<div>${item.points.toFixed(3)} puntos</div>` : '<div>Rework</div>'}
                </div>
                <div class="case-details">
                    <div><strong>Operación:</strong> ${item.description}</div>
                    <div><strong>Fecha:</strong> ${item.timestamp}</div>
                </div>
                ${item.isRework ? `
                    <div class="rework-badge">⚠️ CASO REWORK (${item.reworkType || 'nuevo'})</div>
                ` : ''}
                ${hasNotes ? `
                    <div class="case-notes">
                        <strong>Notas:</strong> ${notes}
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
    grandTotalElement.textContent = state.grandTotal.toFixed(3);
    
    // Actualizar calidad con validación
    const qualityValue = Number(state.qualityPercentage);
    if (isNaN(qualityValue)) {
        qualityPercentageElement.textContent = "100%";
        state.qualityPercentage = 100;
    } else {
        qualityPercentageElement.textContent = `${qualityValue.toFixed(2)}%`;
    }
    
    // Aplicar color según la calidad
    if (state.qualityPercentage >= 80) {
        qualityPercentageElement.className = "quality-value good-quality";
    } else {
        qualityPercentageElement.className = "quality-value poor-quality";
    }
    
    // Actualizar historial
    historyListElement.innerHTML = '';
    
    if (state.history.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'history-item';
        emptyMessage.textContent = 'No hay casos registrados';
        historyListElement.appendChild(emptyMessage);
    } else {
        // Ordenar por timestamp (más reciente primero)
        const sortedHistory = [...state.history].sort((a, b) => 
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
            codeSpan.textContent = `Código: ${op.code}`;
            
            const pointsSpan = document.createElement('span');
            pointsSpan.className = 'case-points';
            if (op.points > 0) {
                pointsSpan.textContent = `${op.points.toFixed(3)} pts`;
            } else {
                pointsSpan.textContent = 'Rework';
            }
            
            headerDiv.appendChild(codeSpan);
            headerDiv.appendChild(pointsSpan);
            
            const descriptionSpan = document.createElement('div');
            descriptionSpan.className = 'case-description';
            descriptionSpan.textContent = `${op.type}: ${op.description}`;
            
            const timestampSpan = document.createElement('div');
            timestampSpan.className = 'case-timestamp';
            timestampSpan.textContent = `Fecha: ${op.timestamp}`;
            
            contentDiv.appendChild(headerDiv);
            contentDiv.appendChild(descriptionSpan);
            contentDiv.appendChild(timestampSpan);
            
            // Mostrar nota si existe
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
                reworkSpan.textContent = `⚠️ Rework${reworkType}`;
                contentDiv.appendChild(reworkSpan);
            }
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-item-actions';
            
            // Botón de notas
            const notesButton = document.createElement('button');
            notesButton.className = 'notes-btn';
            notesButton.innerHTML = '<svg viewBox="0 0 24 24" class="svgIcon" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>';
            notesButton.addEventListener('click', () => showNotesModal(op.id));

            // Botón de eliminar con icono de basurero
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
    undoButton.disabled = state.history.length === 0;
    reworkButton.disabled = state.modelingCases === 0;
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', init);