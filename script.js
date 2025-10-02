
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
    caseNotes: new Map() // Para almacenar notas por caso (id -> nota)
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
const cancelReworkBtn = document.getElementById('cancel-rework-btn');
const notesTextarea = document.getElementById('notes-text');
const saveNotesBtn = document.getElementById('save-notes-btn');
const cancelNotesBtn = document.getElementById('cancel-notes-btn');
const notesModalTitle = document.getElementById('notes-modal-title');

// Variable para almacenar el caso actual para notas
let currentNoteCaseId = null;

// Inicializar la aplicación
function init() {
    loadState();
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
    cancelReworkBtn.addEventListener('click', closeReworkModal);
    saveNotesBtn.addEventListener('click', saveNotes);
    cancelNotesBtn.addEventListener('click', closeNotesModal);
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === codeModal) closeCodeModal();
        if (e.target === reworkModal) closeReworkModal();
        if (e.target === notesModal) closeNotesModal();
    });
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
        caseNotes: new Map()
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
}

// Confirmar rework
function confirmRework() {
    const code = reworkCodeInput.value.trim();
    
    if (code.length === 0) {
        alert('Por favor ingresa un código válido');
        return;
    }
    
    // Verificar que el código existe en los casos
    const caseExists = state.history.some(item => item.code === code && item.type === 'Modeling');
    
    if (!caseExists) {
        alert('El código ingresado no corresponde a ningún caso de Modeling existente.');
        return;
    }
    
    // Agregar rework
    addRework(code);
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
function addRework(code) {
    // Verificar si es el primer rework o un rework adicional
    if (state.reworkCodes.has(code)) {
        // Rework adicional: restar 0.10% de la calidad actual
        state.qualityPercentage = Math.max(0, state.qualityPercentage - 0.10);
    } else {
        // Primer rework: cálculo proporcional normal
        state.reworkCases++;
        state.reworkCodes.add(code);
        calculateQuality();
    }
    
    // Marcar el caso como rework en el historial
    const caseItem = state.history.find(item => item.code === code && item.type === 'Modeling');
    if (caseItem) {
        caseItem.isRework = true;
        caseItem.reworkTimestamp = new Date().toLocaleString();
    }
    
    saveState();
    updateUI();
}

// Eliminar una operación específica
function removeOperation(operationId) {
    const operationIndex = state.history.findIndex(op => op.id === operationId);
    
    if (operationIndex === -1) return;
    
    const operation = state.history[operationIndex];
    
    // Remover del historial
    state.history.splice(operationIndex, 1);
    
    // Remover código
    state.caseCodes.delete(operation.code);
    
    // Remover notas asociadas
    state.caseNotes.delete(operation.id);
    
    // Si era rework, actualizar contadores
    if (operation.isRework && operation.type === 'Modeling') {
        state.reworkCodes.delete(operation.code);
        state.reworkCases = Math.max(0, state.reworkCases - 1);
    }
    
    // Actualizar totales
    if (operation.type === "Modeling") {
        state.modelingTotal -= operation.points;
        state.modelingCases--;
        calculateQuality();
    } else {
        state.ptsTotal -= operation.points;
    }
    
    state.grandTotal = state.modelingTotal + state.ptsTotal;
    
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
    
    // Remover código
    state.caseCodes.delete(lastOperation.code);
    
    // Remover notas asociadas
    state.caseNotes.delete(lastOperation.id);
    
    // Si era rework, actualizar contadores
    if (lastOperation.isRework && lastOperation.type === 'Modeling') {
        state.reworkCodes.delete(lastOperation.code);
        state.reworkCases = Math.max(0, state.reworkCases - 1);
    }
    
    if (lastOperation.type === "Modeling") {
        state.modelingTotal -= lastOperation.points;
        state.modelingCases--;
        calculateQuality();
    } else {
        state.ptsTotal -= lastOperation.points;
    }
    
    state.grandTotal = state.modelingTotal + state.ptsTotal;
    
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
                    <div>${item.points.toFixed(3)} puntos</div>
                </div>
                <div class="case-details">
                    <div><strong>Operación:</strong> ${item.description}</div>
                    <div><strong>Fecha:</strong> ${item.timestamp}</div>
                </div>
                ${item.isRework ? `
                    <div class="rework-badge">⚠️ CASO REWORK</div>
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
            pointsSpan.textContent = `${op.points.toFixed(3)} pts`;
            
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
                reworkSpan.textContent = '⚠️ Rework';
                contentDiv.appendChild(reworkSpan);
            }
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-item-actions';
            
            // Botón de notas
            const notesButton = document.createElement('button');
            notesButton.className = 'notes-btn';
            notesButton.textContent = state.caseNotes.has(op.id) ? '📝 Ver Nota' : '✏️ Agregar Nota';
            notesButton.addEventListener('click', () => showNotesModal(op.id));
            
            // Botón de eliminar
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Eliminar';
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
