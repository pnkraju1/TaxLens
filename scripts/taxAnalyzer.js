// Enhanced Tax analysis engine for detecting and inferring taxes
class TaxAnalyzer {
    constructor() {
        // Explicit tax keywords (for direct detection)
        this.explicitTaxPatterns = {
            'GST': { keywords: ['GST', 'GOODS AND SERVICES TAX', 'G.S.T'], regex: /GST[:\s]*₹?[\d,]+\.?\d*/gi },
            'CGST': { keywords: ['CGST', 'CENTRAL GST', 'C.G.S.T'], regex: /CGST[:\s]*₹?[\d,]+\.?\d*/gi },
            'SGST': { keywords: ['SGST', 'STATE GST', 'S.G.S.T'], regex: /SGST[:\s]*₹?[\d,]+\.?\d*/gi },
            'IGST': { keywords: ['IGST', 'INTEGRATED GST', 'I.G.S.T'], regex: /IGST[:\s]*₹?[\d,]+\.?\d*/gi },
            'TDS': { keywords: ['TDS', 'TAX DEDUCTED AT SOURCE', 'T.D.S'], regex: /TDS[:\s]*₹?[\d,]+\.?\d*/gi },
            'TCS': { keywords: ['TCS', 'TAX COLLECTED AT SOURCE', 'T.C.S'], regex: /TCS[:\s]*₹?[\d,]+\.?\d*/gi },
            'CESS': { keywords: ['CESS', 'EDUCATION CESS', 'HEALTH CESS'], regex: /CESS[:\s]*₹?[\d,]+\.?\d*/gi },
            'STAMP_DUTY': { keywords: ['STAMP DUTY', 'STAMP', 'DUTY'], regex: /STAMP\s*DUTY[:\s]*₹?[\d,]+\.?\d*/gi }
        };

        // Enhanced transaction categories with specific keywords and GST rates
        this.categories = {
            'Restaurant': {
                keywords: ['ZOMATO', 'SWIGGY', 'RESTAURANT', 'CAFE', 'DINE', 'DINNER', 'LUNCH', 'BREAKFAST', 'FOOD DELIVERY', 'CCD', 'KFC', 'MCDONALDS', 'PIZZA HUT', 'DOMINOS', 'STARBUCKS', 'BURGER KING', 'SUBWAY'],
                gstRate: 0.05, // 5% for non-AC restaurants
                description: 'Food & Dining'
            },
            'Groceries': {
                keywords: ['GROCERY', 'SUPERMARKET', 'KIRANA', 'BIG BAZAAR', 'RELIANCE FRESH', 'D-MART', 'VEGETABLES', 'FRUITS', 'SPENCERS', 'MORE RETAIL', 'INSTAMART', 'GROFERS', 'BLINKIT'],
                gstRate: 0.05, // 5% for branded packaged food items
                description: 'Groceries & Food Items'
            },
            'Entertainment': {
                keywords: ['MOVIE TICKETS', 'CINEMA', 'PVR', 'INOX', 'MULTIPLEX', 'THEATRE', 'ENTERTAINMENT', 'BOOKMYSHOW', 'CONCERT', 'SHOW'],
                gstRate: 0.18, // 18% for cinema tickets below ₹100
                description: 'Movies & Entertainment'
            },
            'Utilities': {
                keywords: ['ELECTRICITY BILL', 'WATER BILL', 'GAS BILL', 'BROADBAND', 'INTERNET', 'TELEPHONE', 'MOBILE RECHARGE', 'TATA POWER', 'BSES', 'ADANI', 'AIRTEL', 'JIO', 'VI'],
                gstRate: 0.18, // 18% for most utility services
                description: 'Utilities & Bills'
            },
            'Fuel': {
                keywords: ['PETROL PUMP', 'DIESEL', 'FUEL', 'HPCL', 'BPCL', 'IOCL', 'INDIAN OIL', 'BHARAT PETROLEUM', 'HINDUSTAN PETROLEUM', 'GAS STATION', 'FILLING STATION'],
                gstRate: 0, // Fuel is outside GST
                description: 'Fuel & Transportation'
            },
            'Pharmacy': {
                keywords: ['PHARMACY', 'MEDICAL', 'APOLLO PHARMACY', 'MEDPLUS', 'NETMEDS', 'MEDICINE', 'DRUGS', 'CHEMIST'],
                gstRate: 0.12, // 12% for medicines (some are exempt, but general rate)
                description: 'Healthcare & Medicines'
            },
            'Electronics': {
                keywords: ['ELECTRONICS', 'AMAZON PURCHASE', 'FLIPKART', 'GADGETS', 'MOBILE', 'LAPTOP', 'TV', 'COMPUTER', 'CROMA', 'RELIANCE DIGITAL', 'VIJAY SALES'],
                gstRate: 0.18, // 18% for most electronics
                description: 'Electronics & Gadgets'
            },
            'Non-Taxable': {
                keywords: ['SALARY CREDIT', 'ATM WITHDRAWAL', 'CREDIT CARD BILL PAYMENT', 'INTEREST CREDIT', 'DIVIDEND', 'REFUND', 'TRANSFER', 'NEFT', 'RTGS', 'UPI TRANSFER'],
                gstRate: 0, // No GST on these transactions
                description: 'Non-Taxable Transactions'
            }
        };
    }

    // Main analysis method for PDF with structured transactions
    analyzeStructuredTransactions(transactions) {
        const taxTransactions = [];
        
        transactions.forEach((transaction) => {
            const description = transaction.description.toUpperCase();
            let foundExplicitTax = false;

            // 1. Try to find explicit tax mentions first
            for (const [taxType, pattern] of Object.entries(this.explicitTaxPatterns)) {
                const hasKeyword = pattern.keywords.some(keyword => description.includes(keyword));
                if (hasKeyword) {
                    const amount = this.parseAmount(transaction.amount);
                    if (amount > 0) {
                        taxTransactions.push({
                            type: taxType,
                            amount: amount,
                            description: transaction.description,
                            source: 'explicit',
                            date: transaction.date,
                            originalTransaction: transaction
                        });
                        foundExplicitTax = true;
                    }
                }
            }

            // 2. If no explicit tax found, try to infer based on category
            if (!foundExplicitTax) {
                const category = this.categorizeTransaction(description);
                if (category && this.categories[category].gstRate > 0) {
                    const totalAmount = Math.abs(this.parseAmount(transaction.amount));
                    if (totalAmount > 0) {
                        // Calculate GST included in the transaction amount
                        const gstRate = this.categories[category].gstRate;
                        const inferredTax = totalAmount * (gstRate / (1 + gstRate));
                        
                        taxTransactions.push({
                            type: `Inferred GST (${category})`,
                            amount: inferredTax,
                            description: transaction.description,
                            source: 'inferred',
                            category: category,
                            gstRate: gstRate,
                            totalAmount: totalAmount,
                            date: transaction.date,
                            originalTransaction: transaction
                        });
                    }
                }
            }
        });
        
        return this.summarizeTransactions(taxTransactions);
    }

    // Legacy method for unstructured text (fallback)
    analyzePDFText(text) {
        const transactions = [];
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
            const processedLine = line.toUpperCase();
            let foundExplicitTax = false;

            // 1. Try to find explicit tax mentions first
            for (const [taxType, pattern] of Object.entries(this.explicitTaxPatterns)) {
                const explicitAmounts = this.extractAmounts(processedLine, pattern.regex);
                if (explicitAmounts.length > 0) {
                    explicitAmounts.forEach(amount => {
                        transactions.push({
                            type: taxType,
                            amount: amount,
                            description: line.trim(),
                            source: 'explicit',
                            date: this.extractDate(line) || 'Unknown'
                        });
                        foundExplicitTax = true;
                    });
                }
            }

            // 2. If no explicit tax found, try to infer based on category
            if (!foundExplicitTax) {
                const category = this.categorizeTransaction(processedLine);
                if (category && this.categories[category].gstRate > 0) {
                    const totalAmount = this.extractTotalAmount(processedLine);
                    if (totalAmount > 0) {
                        const gstRate = this.categories[category].gstRate;
                        const inferredTax = totalAmount * (gstRate / (1 + gstRate));
                        transactions.push({
                            type: `Inferred GST (${category})`,
                            amount: inferredTax,
                            description: line.trim(),
                            source: 'inferred',
                            category: category,
                            gstRate: gstRate,
                            date: this.extractDate(line) || 'Unknown'
                        });
                    }
                }
            }
        });
        
        return this.summarizeTransactions(transactions);
    }

    analyzeCSVData(data) {
        const transactions = [];
        
        data.forEach((row, index) => {
            const rowText = Object.values(row).join(' ').toUpperCase();
            let foundExplicitTax = false;

            // 1. Try to find explicit tax mentions first
            for (const [taxType, pattern] of Object.entries(this.explicitTaxPatterns)) {
                const hasKeyword = pattern.keywords.some(keyword => rowText.includes(keyword));
                if (hasKeyword) {
                    const amount = this.findAmountInRow(row);
                    if (amount > 0) {
                        transactions.push({
                            type: taxType,
                            amount: amount,
                            description: this.getRowDescription(row),
                            source: 'explicit',
                            date: this.findDateInRow(row) || 'Unknown'
                        });
                        foundExplicitTax = true;
                    }
                }
            }

            // 2. If no explicit tax found, try to infer based on category
            if (!foundExplicitTax) {
                const category = this.categorizeTransaction(rowText);
                if (category && this.categories[category].gstRate > 0) {
                    const totalAmount = Math.abs(this.findAmountInRow(row));
                    if (totalAmount > 0) {
                        const gstRate = this.categories[category].gstRate;
                        const inferredTax = totalAmount * (gstRate / (1 + gstRate));
                        transactions.push({
                            type: `Inferred GST (${category})`,
                            amount: inferredTax,
                            description: this.getRowDescription(row),
                            source: 'inferred',
                            category: category,
                            gstRate: gstRate,
                            date: this.findDateInRow(row) || 'Unknown'
                        });
                    }
                }
            }
        });
        
        return this.summarizeTransactions(transactions);
    }

    categorizeTransaction(text) {
        // Check each category for keyword matches
        for (const [category, data] of Object.entries(this.categories)) {
            if (data.keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        return null;
    }

    parseAmount(amountStr) {
        // Parse amount string like "INR -850.00" or "INR 85,000.00"
        if (!amountStr) return 0;
        
        const cleanAmount = amountStr.toString()
            .replace(/INR/gi, '')
            .replace(/[,\s]/g, '')
            .trim();
        
        const amount = parseFloat(cleanAmount);
        return isNaN(amount) ? 0 : Math.abs(amount); // Return absolute value
    }

    extractAmounts(text, regex) {
        const matches = text.match(regex) || [];
        return matches.map(match => {
            const cleanAmount = match.replace(/[^\d.]/g, '');
            const amount = parseFloat(cleanAmount);
            return isNaN(amount) ? 0 : amount;
        }).filter(amount => amount > 0);
    }

    extractTotalAmount(text) {
        const amountRegex = /(?:₹|RS\.?\s*|INR\.?\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi;
        let matches = [];
        let match;
        while ((match = amountRegex.exec(text)) !== null) {
            matches.push(parseFloat(match[1].replace(/,/g, '')));
        }
        return matches.length > 0 ? Math.max(...matches) : 0;
    }

    findAmountInRow(row) {
        const amountColumns = ['amount', 'debit', 'credit', 'withdrawal', 'deposit', 'value', 'txn_amount', 'transaction_amount'];
        
        for (const col of amountColumns) {
            for (const [key, value] of Object.entries(row)) {
                if (key.toLowerCase().includes(col) && value) {
                    const amount = this.parseAmount(value);
                    if (amount > 0) {
                        return amount;
                    }
                }
            }
        }
        
        const rowText = Object.values(row).join(' ');
        return this.extractTotalAmount(rowText);
    }

    getRowDescription(row) {
        const descColumns = ['description', 'narration', 'particulars', 'details', 'transaction_details', 'remark'];
        for (const col of descColumns) {
            for (const [key, value] of Object.entries(row)) {
                if (key.toLowerCase().includes(col) && value) {
                    return value.toString();
                }
            }
        }
        return Object.values(row).find(val => val && val.toString().trim()) || 'Unknown';
    }

    findDateInRow(row) {
        const dateColumns = ['date', 'transaction_date', 'value_date', 'txn_date'];
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
        const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/;
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
            summary.totalTax += transaction.amount;
            
            const typeKey = transaction.type;

            if (!summary.byType[typeKey]) {
                summary.byType[typeKey] = {
                    total: 0,
                    count: 0,
                    transactions: []
                };
            }
            summary.byType[typeKey].total += transaction.amount;
            summary.byType[typeKey].count += 1;
            summary.byType[typeKey].transactions.push(transaction);
            
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
