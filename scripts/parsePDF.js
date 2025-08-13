// Enhanced PDF parsing functionality using pdf.js
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
            
            // Process the extracted text to identify transaction lines
            const transactions = this.extractTransactionLines(fullText);
            
            return {
                success: true,
                text: fullText,
                transactions: transactions,
                pages: numPages
            };
            
        } catch (error) {
            console.error("PDF parsing error:", error);
            return {
                success: false,
                error: error.message,
                text: "",
                transactions: []
            };
        }
    }

    extractTransactionLines(text) {
        const lines = text.split('\n');
        const transactions = [];
        
        // Pattern to identify transaction lines
        // Looking for lines that contain: Date, Description, Amount pattern
        const transactionPattern = /(\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4})/;
        const amountPattern = /(INR\s*[-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and headers
            if (!line || line.toLowerCase().includes('date') || 
                line.toLowerCase().includes('description') || 
                line.toLowerCase().includes('balance')) {
                continue;
            }
            
            // Check if line contains a date pattern
            const dateMatch = line.match(transactionPattern);
            if (dateMatch) {
                // Extract amounts from the line
                const amounts = [];
                let match;
                const amountRegex = new RegExp(amountPattern.source, 'gi');
                while ((match = amountRegex.exec(line)) !== null) {
                    amounts.push(match[1]);
                }
                
                if (amounts.length > 0) {
                    // Extract description (text between date and first amount)
                    const dateStr = dateMatch[0];
                    const firstAmountIndex = line.indexOf(amounts[0]);
                    const description = line.substring(line.indexOf(dateStr) + dateStr.length, firstAmountIndex).trim();
                    
                    // Clean up description
                    const cleanDescription = description.replace(/^\s*[-|]\s*/, '').trim();
                    
                    if (cleanDescription) {
                        transactions.push({
                            date: dateStr,
                            description: cleanDescription,
                            amount: amounts[0], // Transaction amount (first amount found)
                            balance: amounts[1] || null, // Balance (second amount if present)
                            rawLine: line
                        });
                    }
                }
            }
        }
        
        return transactions;
    }
}

// Export for use in other scripts
window.PDFParser = PDFParser;
