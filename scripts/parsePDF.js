// PDF parsing functionality using pdf.js
class PDFParser {
    constructor() {
        this.pdfjsLib = null;
        this.isLibraryLoaded = false;
    }

    async loadLibrary() {
        if (this.isLibraryLoaded) return;
        
        // Load pdf.js from CDN
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = ( ) => {
                this.pdfjsLib = window.pdfjsLib;
                this.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                this.isLibraryLoaded = true;
                resolve( );
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async parseFile(file) {
        try {
            await this.loadLibrary();
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await this.pdfjsLib.getDocument(arrayBuffer).promise;
            
            let fullText = "";
            const numPages = pdf.numPages;
            
            // Extract text from all pages
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Combine all text items from the page
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }
            
            return {
                success: true,
                text: fullText,
                pages: numPages
            };
            
        } catch (error) {
            console.error("PDF parsing error:", error);
            return {
                success: false,
                error: error.message,
                text: ""
            };
        }
    }
}

// Export for use in other scripts
window.PDFParser = PDFParser;
