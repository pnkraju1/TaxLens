// Tax analysis engine for detecting taxes from parsed content
class TaxAnalyzer {
    constructor() {
        // Define tax keywords and patterns
        this.taxPatterns = {
            'GST': {
                keywords: ['GST', 'GOODS AND SERVICES TAX', 'G.S.T'],
                regex: /GST[:\s]*₹?[\d,]+\.?\d*/gi
            },
            'CGST': {
                keywords: ['CGST', 'CENTRAL GST', 'C.G.S.T'],
                regex: /CGST[:\s]*₹?[\d,]+\.?\d*/gi
            },
            'SGST': {
                keywords: ['SGST', 'STATE GST', 'S.G.S.T'],
                regex: /SGST[:\s]*₹?[\d,]+\.?\d*/gi
            },
            'IGST': {
                keywords: ['IGST', 'INTEGRATED GST', 'I.G.S.T'],
                regex: /IGST[:\s]*₹?[\d,]+\.?\d*/gi
            },
            'TDS': {
                keywords: ['TDS', 'TAX DEDUCTED AT SOURCE', 'T.D.S'],
                regex: /TDS[:\s]*₹?[\d,]+\.?\d*/gi
            },
            'TCS': {
                keywords: ['TCS', 'TAX COLLECTED AT SOURCE', 'T.C.S'],
                regex: /TCS[:\s]*₹?[\d,]+\.?\d*/gi
            },
            'CESS': {
                keywords: ['CESS', 'EDUCATION CESS', 'HEALTH CESS'],
                regex: /CESS[:\s]*₹?[\d,]+\.?\d*/gi
            },
            'STAMP_DUTY': {
                keywords: ['STAMP DUTY', 'STAMP', 'DUTY'],
                regex: /STAMP\s*DUTY[:\s]*₹?[\d,]+\.?\d*/gi
            }
        };
    }

    analyzePDFText(text) {
        const transactions = [];
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
            for (const [taxType, pattern] of Object.entries(this.taxPatterns)) {
                // Check if line contains tax keywords
                const hasKeyword = pattern.keywords.some(keyword => 
                    line.toUpperCase().includes(keyword)
                );
                
                if (hasKeyword) {
                    // Extract amount using regex
                    const amounts = this.extractAmounts(line);
                    amounts.forEach(amount => {
                        transactions.push({
                            type: taxType,
                            amount: amount,
                            description: line.trim(),
                            lineNumber: index + 1,
                            date: this.extractDate(line) || 'Unknown'
                        });
                    });
                }
            }
        });
        
        return this.summarizeTransactions(transactions);
    }

    analyzeCSVData(data) {
        const transactions = [];
        
        data.forEach((row, index) => {
            // Check all columns for tax-related content
            const rowText = Object.values(row).join(' ').toUpperCase();
            
            for (const [taxType, pattern] of Object.entries(this.taxPatterns)) {
                const hasKeyword = pattern.keywords.some(keyword => 
                    rowText.includes(keyword)
                );
                
                if (hasKeyword) {
                    // Try to find amount in dedicated amount columns
                    const amount = this.findAmountInRow(row);
                    if (amount > 0) {
                        transactions.push({
                            type: taxType,
                            amount: amount,
                            description: this.getRowDescription(row),
                            rowNumber: index + 1,
                            date: this.findDateInRow(row) || 'Unknown'
                        });
                    }
                }
            }
        });
        
        return this.summarizeTransactions(transactions);
    }

    extractAmounts(text) {
        // Extract numeric amounts from text
        const amountRegex = /₹?[\d,]+\.?\d*/g;
        const matches = text.match(amountRegex) || [];
        
        return matches.map(match => {
            // Clean and convert to number
            const cleanAmount = match.replace(/[₹,]/g, '');
            const amount = parseFloat(cleanAmount);
            return isNaN(amount) ? 0 : amount;
        }).filter(amount => amount > 0);
    }

    findAmountInRow(row) {
        // Look for amount in common column names
        const amountColumns = ['amount', 'debit', 'credit', 'withdrawal', 'deposit'];
        
        for (const col of amountColumns) {
            for (const [key, value] of Object.entries(row)) {
                if (key.toLowerCase().includes(col) && value) {
                    const amount = parseFloat(value.toString().replace(/[₹,]/g, ''));
                    if (!isNaN(amount) && amount > 0) {
                        return amount;
                    }
                }
            }
        }
        
        // If no dedicated amount column, extract from description
        const rowText = Object.values(row).join(' ');
        const amounts = this.extractAmounts(rowText);
        return amounts.length > 0 ? amounts[0] : 0;
    }

    getRowDescription(row) {
        // Get the most descriptive field from the row
        const descColumns = ['description', 'narration', 'particulars', 'details'];
        
        for (const col of descColumns) {
            for (const [key, value] of Object.entries(row)) {
                if (key.toLowerCase().includes(col) && value) {
                    return value.toString();
                }
            }
        }
        
        // Fallback to first non-empty value
        return Object.values(row).find(val => val && val.toString().trim()) || 'Unknown';
    }

    findDateInRow(row) {
        const dateColumns = ['date', 'transaction_date', 'value_date'];
        
        for (const col of dateColumns) {
            for (const [key, value] of Object.entries(row)) {
                if (key.toLowerCase().includes(col) && value) {
                    return value.toString();
                }
            }
        }
        return null;
    }

    extractDate(text) {
        // Simple date extraction - can be improved
        const dateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
        const match = text.match(dateRegex);
        return match ? match[0] : null;
    }

    summarizeTransactions(transactions) {
        const summary = {
            totalTax: 0,
            byType: {},
            byMonth: {},
            transactions: transactions,
            count: transactions.length
        };

        transactions.forEach(transaction => {
            // Add to total
            summary.totalTax += transaction.amount;
            
            // Group by type
            if (!summary.byType[transaction.type]) {
                summary.byType[transaction.type] = {
                    total: 0,
                    count: 0,
                    transactions: []
                };
            }
            summary.byType[transaction.type].total += transaction.amount;
            summary.byType[transaction.type].count += 1;
            summary.byType[transaction.type].transactions.push(transaction);
            
            // Group by month (if date is available)
            if (transaction.date !== 'Unknown') {
                const month = this.getMonthFromDate(transaction.date);
                if (month) {
                    if (!summary.byMonth[month]) {
                        summary.byMonth[month] = 0;
                    }
                    summary.byMonth[month] += transaction.amount;
                }
            }
        });

        return summary;
    }

    getMonthFromDate(dateString) {
        try {
            // Try to parse the date and extract month-year
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
            }
        } catch (e) {
            // Ignore parsing errors
        }
        return null;
    }
}

// Export for use in other scripts
window.TaxAnalyzer = TaxAnalyzer;
