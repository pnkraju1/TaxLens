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
            script.onload = () => {
                this.pdfjsLib = window.pdfjsLib;
                this.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                this.isLibraryLoaded = true;
                resolve();
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
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            // Try to extract structured transactions
            const transactions = this.extractStructuredTransactions(fullText);
            
            console.log("Extracted text sample:", fullText.substring(0, 500));
            console.log("Found transactions:", transactions);
            
            return {
                success: true,
                text: fullText,
                pages: numPages,
                transactions: transactions
            };
            
        } catch (error) {
            console.error('PDF parsing error:', error);
            return {
                success: false,
                error: error.message,
                text: ''
            };
        }
    }

    extractStructuredTransactions(text) {
        const transactions = [];
        const lines = text.split('\n');
        
        // More flexible patterns for Indian bank statements
        const datePatterns = [
            /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/g,  // DD-MM-YYYY or DD/MM/YYYY
            /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g   // YYYY-MM-DD or YYYY/MM/DD
        ];
        
        // More flexible amount patterns
        const amountPatterns = [
            /INR\s*([-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,  // INR -1,234.56
            /Rs\.?\s*([-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, // Rs. -1,234.56
            /₹\s*([-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,     // ₹ -1,234.56
            /([-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)(?=\s|$)/g  // Just numbers -1,234.56
        ];
        
        console.log("Processing", lines.length, "lines from PDF");
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Look for date patterns
            let dateMatch = null;
            let datePattern = null;
            
            for (const pattern of datePatterns) {
                pattern.lastIndex = 0; // Reset regex
                const match = pattern.exec(line);
                if (match) {
                    dateMatch = match;
                    datePattern = pattern;
                    break;
                }
            }
            
            if (dateMatch) {
                // Found a date, now look for amounts in the same line
                const amounts = [];
                
                for (const pattern of amountPatterns) {
                    pattern.lastIndex = 0; // Reset regex
                    let match;
                    while ((match = pattern.exec(line)) !== null) {
                        amounts.push(match[1] || match[0]);
                    }
                }
                
                if (amounts.length > 0) {
                    // Extract description (text between date and first amount)
                    const dateStr = dateMatch[0];
                    const dateEndIndex = line.indexOf(dateStr) + dateStr.length;
                    const firstAmount = amounts[0];
                    const firstAmountIndex = line.indexOf(firstAmount);
                    
                    let description = "";
                    if (firstAmountIndex > dateEndIndex) {
                        description = line.substring(dateEndIndex, firstAmountIndex).trim();
                        // Clean up description
                        description = description.replace(/^\s*[-|]\s*/, '').trim();
                        description = description.replace(/\s+/g, ' '); // Normalize whitespace
                    }
                    
                    if (description && description.length > 3) { // Ensure meaningful description
                        const transaction = {
                            date: dateStr,
                            description: description,
                            amount: firstAmount,
                            balance: amounts[1] || null,
                            rawLine: line
                        };
                        
                        transactions.push(transaction);
                        console.log("Found transaction:", transaction);
                    }
                }
            }
        }
        
        console.log("Total transactions extracted:", transactions.length);
        return transactions;
    }
}

// Export for use in other scripts
window.PDFParser = PDFParser;

