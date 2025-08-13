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

    // Handle drag and drop events
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drop-zone-over");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drop-zone-over");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drop-zone-over");
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Handle Analyze Now button click
    analyzeBtn.addEventListener("click", () => {
        if (selectedFile && !isAnalyzing) {
            analyzeFile(selectedFile);
        }
    });

    // --- Functions ---

    function handleFile(file) {
        hideError();
        selectedFile = file;
        fileNameSpan.textContent = file.name;
        fileInfo.classList.remove("hidden");
        updateAnalyzeButton("Analyze Now", false);
    }

    async function analyzeFile(file) {
        isAnalyzing = true;
        updateAnalyzeButton("Analyzing...", true);
        showProgress("Starting analysis...");
        hideError();

        let analysisResult = null;

        try {
            if (file.type === "application/pdf") {
                showProgress("Parsing PDF...");
                const pdfResult = await pdfParser.parseFile(file);
                if (pdfResult.success) {
                    showProgress("Analyzing PDF content for taxes...");
                    analysisResult = taxAnalyzer.analyzePDFText(pdfResult.text);
                } else {
                    throw new Error(pdfResult.error || "Failed to parse PDF.");
                }
            } else if (file.type === "text/csv") {
                showProgress("Parsing CSV...");
                const csvResult = await csvParser.parseFile(file);
                if (csvResult.success) {
                    showProgress("Analyzing CSV data for taxes...");
                    analysisResult = taxAnalyzer.analyzeCSVData(csvResult.data);
                } else {
                    throw new Error(csvResult.error || "Failed to parse CSV.");
                }
            } else {
                throw new Error("Unsupported file type. Please upload a PDF or CSV.");
            }

            if (analysisResult) {
                // Add file name and analysis date to results
                analysisResult.fileName = file.name;
                analysisResult.analysisDate = new Date().toISOString();
                
                // Store results in session storage for results.html
                sessionStorage.setItem("taxAnalysisResult", JSON.stringify(analysisResult));
                
                showProgress("Analysis complete. Redirecting to results...");
                // Redirect to results page after a short delay
                setTimeout(() => {
                    window.location.href = "results.html";
                }, 1000);

            } else {
                throw new Error("No analysis result generated.");
            }

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
        // You can enhance this to show a proper progress indicator
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
