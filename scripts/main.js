document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const fileInfo = document.getElementById('file-info');
    const fileNameSpan = document.getElementById('file-name');
    const analyzeBtn = document.getElementById('analyze-btn');
    const errorMessage = document.getElementById('error-message');

    let selectedFile = null;

    // --- Event Listeners ---

    // Open file dialog when browse button is clicked
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Open file dialog when drop zone is clicked
    dropZone.addEventListener('click', (e) => {
        // Prevent opening file dialog if a button inside was clicked
        if (e.target.tagName !== 'BUTTON') {
            fileInput.click();
        }
    });

    // Handle file selection from file dialog
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    // --- Drag and Drop Handlers ---

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // Prevent default behavior (opening file in browser)
        e.stopPropagation();
        dropZone.classList.add('drop-zone-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drop-zone-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drop-zone-over');

        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    // --- Analysis Button ---
    
    analyzeBtn.addEventListener('click', () => {
        if (selectedFile) {
            console.log(`Analyzing file: ${selectedFile.name}`);
            // Placeholder for analysis logic
            // We will store the file in session storage and redirect to results page
            alert(`Analysis started for ${selectedFile.name}. \n(Next step: Build the results page and parsing logic)`);
            
            // For now, let's just log it. Later we will redirect to results.html
            // window.location.href = 'results.html'; 
        }
    });


    // --- Helper Functions ---

    function handleFile(file) {
        // Reset previous errors
        hideError();

        // Validate file type
        const allowedTypes = ['application/pdf', 'text/csv'];
        if (file && allowedTypes.includes(file.type)) {
            selectedFile = file;
            fileNameSpan.textContent = file.name;
            fileInfo.classList.remove('hidden');
            console.log('File selected:', file);
        } else {
            selectedFile = null;
            fileInfo.classList.add('hidden');
            showError('Invalid file type. Please upload a PDF or CSV file.');
            console.error('Invalid file type:', file.type);
        }
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }
});
