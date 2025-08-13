document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const browseBtn = document.getElementById("browse-btn");
    const fileInfo = document.getElementById("file-info");
    const fileNameSpan = document.getElementById("file-name");
    const analyzeBtn = document.getElementById("analyze-btn");
    const errorMessage = document.getElementById("error-message");

    let selectedFile = null;
    let isAnalyzing = false;

    // Initialize parsers
    const pdfParser = new PDFParser();
    const csvParser = new CSVParser();
    const taxAnalyzer = new TaxAnalyzer();

    // --- Event Listeners ---

    // Open file dialog when browse button is clicked
    browseBtn.addEventListener("click", () => {
        fileInput.click();
    });

    // Open file dialog when drop zone is clicked
    dropZone.addEventListener("click", (e) => {
        // Prevent opening file dialog if a button inside was clicked
        if (e.target.tagName !== "BUTTON") {
            fileInput.click();
        }
    });

    // Handle file selection from file dialog
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    // Handle drag and drop
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drop-zone-over");
    });

    dropZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drop-zone-over");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drop-zone-over");
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Handle analyze button click
    analyzeBtn.addEventListener("click", () => {
        if (selectedFile && !isAnalyzing) {
            analyzeFile();
        }
    });

    // --- Helper Functions ---

    function handleFile(file) {
        hideError();
        
        // Validate file type
        const allowedTypes = ["application/pdf", "text/csv", "application/vnd.ms-excel"];
        const allowedExtensions = [".pdf", ".csv"];
        
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            showError("Please upload a PDF or CSV file only.");
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showError("File size must be less than 10MB.");
            return;
        }

        selectedFile = file;
        
        // Update UI
        fileNameSpan.textContent = file.name;
        fileInfo.classList.remove("hidden");
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove("opacity-50", "cursor-not-allowed");
        analyzeBtn.classList.add("hover:bg-emerald-700");
    }

    async function analyzeFile() {
        if (!selectedFile) return;

        isAnalyzing = true;
        updateAnalyzeButton("Analyzing...", true);
        hideError();

        try {
            showProgress("Starting analysis...");
            
            let analysisResult;
            
            if (selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")) {
                showProgress("Parsing PDF...");
                const pdfResult = await pdfParser.parseFile(selectedFile);
                
                if (!pdfResult.success) {
                    throw new Error(`PDF parsing failed: ${pdfResult.error}`);
                }

                showProgress("Analyzing transactions...");
                
                // Use structured transactions if available, otherwise fall back to text analysis
                if (pdfResult.transactions && pdfResult.transactions.length > 0) {
                    console.log("Using structured transaction analysis");
                    console.log("Extracted transactions:", pdfResult.transactions);
                    analysisResult = taxAnalyzer.analyzeStructuredTransactions(pdfResult.transactions);
                } else {
                    console.log("Falling back to text analysis");
                    analysisResult = taxAnalyzer.analyzePDFText(pdfResult.text);
                }
                
            } else if (selectedFile.type === "text/csv" || selectedFile.name.toLowerCase().endsWith(".csv")) {
                showProgress("Parsing CSV...");
                const csvResult = await csvParser.parseFile(selectedFile);
                
                if (!csvResult.success) {
                    throw new Error(`CSV parsing failed: ${csvResult.error}`);
                }

                showProgress("Analyzing transactions...");
                analysisResult = taxAnalyzer.analyzeCSVData(csvResult.data);
            } else {
                throw new Error("Unsupported file type");
            }

            showProgress("Generating results...");

            // Store results in session storage for the results page
            const resultsData = {
                fileName: selectedFile.name,
                fileType: selectedFile.type,
                analysisDate: new Date().toISOString(),
                totalTax: analysisResult.totalTax,
                count: analysisResult.count,
                byType: analysisResult.byType,
                byMonth: analysisResult.byMonth,
                transactions: analysisResult.transactions
            };

            sessionStorage.setItem("taxAnalysisResult", JSON.stringify(resultsData));

            showProgress("Analysis complete. Check console for results.");
            // Removed: window.location.href = "results.html";

        } catch (error) {
            console.error("Analysis error:", error);
            showError(`Analysis failed: ${error.message}`);
        } finally {
            isAnalyzing = false;
            updateAnalyzeButton("Analyze Now", false);
        }
    }

    function updateAnalyzeButton(text, disabled) {
        analyzeBtn.textContent = text;
        analyzeBtn.disabled = disabled;
        if (disabled) {
            analyzeBtn.classList.add("opacity-50", "cursor-not-allowed");
            analyzeBtn.classList.remove("hover:bg-emerald-700");
        } else {
            analyzeBtn.classList.remove("opacity-50", "cursor-not-allowed");
            analyzeBtn.classList.add("hover:bg-emerald-700");
        }
    }

    function showProgress(message) {
        console.log("Progress:", message);
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove("hidden");
    }

    function hideError() {
        errorMessage.classList.add("hidden");
    }
});
