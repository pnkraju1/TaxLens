// Advanced Tax analysis engine for detecting and inferring taxes
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

        // Transaction categories and their associated keywords and typical GST rates
        // Rates are for inference when explicit tax is not found
        this.categories = {
            'Restaurant': {
                keywords: ['ZOMATO', 'SWIGGY', 'RESTAURANT', 'CAFE', 'DINE', 'FOOD', 'HOTEL', 'CCD', 'KFC', 'MCDONALDS', 'PIZZA HUT', 'DOMINOS', 'STARBUCKS'],
                gstRate: 0.05 // 5% for non-AC, general assumption for inference
            },
            'Fuel': {
                keywords: ['PETROL', 'DIESEL', 'FUEL', 'HPCL', 'BPCL', 'IOCL', 'GAS STATION', 'FILLING STATION'],
                gstRate: 0 // Fuel is typically outside GST, subject to VAT/Excise
            },
            'Electronics': {
                keywords: ['ELECTRONICS', 'GADGETS', 'MOBILE', 'LAPTOP', 'TV', 'FRIDGE', 'WASHING MACHINE', 'AC', 'CROMA', 'RELIANCE DIGITAL', 'AMAZON', 'FLIPKART', 'APPLE', 'SAMSUNG', 'XIAOMI'],
                gstRate: 0.18 // Most electronics are 18%
            },
            'Groceries': {
                keywords: ['GROCERY', 'SUPERMARKET', 'KIRANA', 'BIG BAZAAR', 'RELIANCE FRESH', 'D-MART', 'MILK', 'BREAD', 'VEGETABLES', 'FRUITS', 'SPENCERS', 'MORE RETAIL'],
                gstRate: 0.05 // Branded packaged food items
            },
            'Services': {
                keywords: ['CONSULTING', 'SOFTWARE', 'IT SERVICES', 'LEGAL FEES', 'MAINTENANCE', 'REPAIR', 'SALON', 'SPA', 'GYM', 'SUBSCRIPTION', 'SERVICE CHARGE', 'PROFESSIONAL FEES', 'ADVISORY'],
                gstRate: 0.18 // Most services are 18%
            },
            'Travel': {
                keywords: ['FLIGHT', 'AIRLINE', 'TRAIN', 'BUS', 'TAXI', 'CAB', 'OLA', 'UBER', 'MAKEMYTRIP', 'GOIBIBO', 'TRAVEL', 'TICKET', 'AIRPORT', 'RAILWAY'],
                gstRate: 0.05 // Economy air/rail travel
            },
            'Accommodation': {
                keywords: ['HOTEL', 'RESORT', 'HOMESTAY', 'BOOKING.COM', 'OYO', 'TREEBO'],
                gstRate: 0.12 // General assumption for hotels (1000-7500 tariff)
            },
            'Apparel': {
                keywords: ['APPAREL', 'CLOTHING', 'SHOES', 'GARMENTS', 'ZARA', 'H&M', 'ADIDAS', 'NIKE', 'FASHION', 'BOUTIQUE'],
                gstRate: 0.12 // Apparel above 1000, footwear above 500
            },
            'Utilities': {
                keywords: ['ELECTRICITY', 'WATER BILL', 'BROADBAND', 'INTERNET', 'TELEPHONE', 'MOBILE RECHARGE', 'GAS BILL'],
                gstRate: 0.18 // Most utility services
            },
            'Healthcare': {
                keywords: ['HOSPITAL', 'CLINIC', 'PHARMACY', 'MEDICINE', 'DOCTOR', 'LAB', 'DIAGNOSTICS'],
                gstRate: 0.00 // Healthcare services are generally exempt
            }
        };
    }

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
                    const totalAmount = this.extractTotalAmount(processedLine); // Attempt to find a total amount in the line
                    if (totalAmount > 0) {
                        const inferredTax = totalAmount * (this.categories[category].gstRate / (1 + this.categories[category].gstRate));
                        transactions.push({
                            type: `Inferred GST (${category})`,
                            amount: inferredTax,
                            description: line.trim(),
                            source: 'inferred',
                            category: category,
                            gstRate: this.categories[category].gstRate,
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
                // For CSV, we'll rely on keyword presence in rowText for explicit tax
                const hasKeyword = pattern.keywords.some(keyword => rowText.includes(keyword));
                if (hasKeyword) {
                    const amount = this.findAmountInRow(row); // Find amount from CSV columns
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
                    const totalAmount = this.findAmountInRow(row); // Use the amount from CSV columns as total
                    if (totalAmount > 0) {
                        const inferredTax = totalAmount * (this.categories[category].gstRate / (1 + this.categories[category].gstRate));
                        transactions.push({
                            type: `Inferred GST (${category})`,
                            amount: inferredTax,
                            description: this.getRowDescription(row),
                            source: 'inferred',
                            category: category,
                            gstRate: this.categories[category].gstRate,
                            date: this.findDateInRow(row) || 'Unknown'
                        });
                    }
                }
            }
        });
        
        return this.summarizeTransactions(transactions);
    }

    categorizeTransaction(text) {
        for (const [category, data] of Object.entries(this.categories)) {
            if (data.keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        return null;
    }

    extractAmounts(text, regex) {
        // Extracts amounts using a specific regex (for explicit taxes)
        const matches = text.match(regex) || [];
        return matches.map(match => {
            const cleanAmount = match.replace(/[^\d.]/g, ''); // Remove non-numeric except dot
            const amount = parseFloat(cleanAmount);
            return isNaN(amount) ? 0 : amount;
        }).filter(amount => amount > 0);
    }

    extractTotalAmount(text) {
        // Attempt to find a general transaction amount in the line
        // This regex looks for numbers that might represent a total transaction value
        const amountRegex = /(?:₹|RS\.?\s*|INR\.?\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi;
        let matches = [];
        let match;
        while ((match = amountRegex.exec(text)) !== null) {
            matches.push(parseFloat(match[1].replace(/,/g, '')));
        }
        // Return the largest amount found, assuming it's the total transaction value
        return matches.length > 0 ? Math.max(...matches) : 0;
    }

    findAmountInRow(row) {
        // Look for amount in common column names for CSV
        const amountColumns = ['amount', 'debit', 'credit', 'withdrawal', 'deposit', 'value', 'txn_amount', 'transaction_amount'];
        
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
        
        // Fallback: extract from any string field in the row
        const rowText = Object.values(row).join(' ');
        const amounts = this.extractTotalAmount(rowText);
        return amounts > 0 ? amounts : 0;
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
        // Improved date extraction for various formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
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
            
            const typeKey = transaction.source === 'inferred' ? `Inferred GST (${transaction.category})` : transaction.type;

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
