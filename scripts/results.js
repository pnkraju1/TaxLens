document.addEventListener("DOMContentLoaded", () => {
    const loading = document.getElementById("loading");
    const errorState = document.getElementById("error-state");
    const resultsContent = document.getElementById("results-content");
    
    // Load and display results
    loadResults();

    function loadResults() {
        try {
            // Get analysis results from session storage
            const resultsData = sessionStorage.getItem("taxAnalysisResult");
            
            if (!resultsData) {
                showError();
                return;
            }

            const results = JSON.parse(resultsData);
            displayResults(results);
            
        } catch (error) {
            console.error("Error loading results:", error);
            showError();
        }
    }

    function showError() {
        loading.classList.add("hidden");
        errorState.classList.remove("hidden");
    }

    function displayResults(results) {
        // Hide loading, show content
        loading.classList.add("hidden");
        resultsContent.classList.remove("hidden");

        // Populate file info
        document.getElementById("file-name").textContent = results.fileName;
        document.getElementById("analysis-date").textContent = new Date(results.analysisDate).toLocaleDateString("en-IN");

        // Populate summary cards
        document.getElementById("total-tax").textContent = `₹${results.totalTax.toLocaleString("en-IN")}`;
        document.getElementById("transaction-count").textContent = results.count;
        
        // Find and display top tax type
        const topTaxType = getTopTaxType(results.byType);
        document.getElementById("top-tax-type").textContent = topTaxType;

        // Create charts
        createTaxTypeChart(results.byType);
        createMonthlyTrendChart(results.byMonth);

        // Populate transactions table
        populateTransactionsTable(results.transactions);

        // Setup export buttons
        setupExportButtons(results);
    }

    function getTopTaxType(byType) {
        let maxAmount = 0;
        let topType = "-";
        
        for (const [type, data] of Object.entries(byType)) {
            if (data.total > maxAmount) {
                maxAmount = data.total;
                topType = formatTaxType(type);
            }
        }
        
        return topType;
    }

    function formatTaxType(type) {
        const typeMap = {
            "GST": "GST",
            "CGST": "CGST",
            "SGST": "SGST", 
            "IGST": "IGST",
            "TDS": "TDS",
            "TCS": "TCS",
            "CESS": "Cess",
            "STAMP_DUTY": "Stamp Duty"
        };
        return typeMap[type] || type;
    }

    function createTaxTypeChart(byType) {
        const ctx = document.getElementById("tax-type-chart").getContext("2d");
        
        const labels = Object.keys(byType).map(formatTaxType);
        const data = Object.values(byType).map(item => item.total);
        const colors = [
            "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
            "#ef4444", "#06b6d4", "#84cc16", "#f97316"
        ];

        new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    function createMonthlyTrendChart(byMonth) {
        const ctx = document.getElementById("monthly-trend-chart").getContext("2d");
        
        const sortedMonths = Object.keys(byMonth).sort((a, b) => {
            return new Date(a) - new Date(b);
        });
        
        const labels = sortedMonths;
        const data = sortedMonths.map(month => byMonth[month]);

        new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Tax Amount (₹)",
                    data: data,
                    backgroundColor: "#10b981",
                    borderColor: "#059669",
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return "₹" + value.toLocaleString("en-IN");
                            }
                        }
                    }
                }
            }
        });
    }

    function populateTransactionsTable(transactions) {
        const tbody = document.getElementById("transactions-table");
        tbody.innerHTML = "";

        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                        No tax transactions found in the uploaded file.
                    </td>
                </tr>
            `;
            return;
        }

        transactions.forEach(transaction => {
            const row = document.createElement("tr");
            row.className = "hover:bg-gray-50";
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${transaction.date}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        ${formatTaxType(transaction.type)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹${transaction.amount.toLocaleString("en-IN")}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    ${transaction.description}
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    function setupExportButtons(results) {
        document.getElementById("export-csv").addEventListener("click", () => {
            exportToCSV(results);
        });

        document.getElementById("export-pdf").addEventListener("click", () => {
            exportToPDF(results);
        });
    }

    function exportToCSV(results) {
        const headers = ["Date", "Tax Type", "Amount", "Description"];
        const rows = results.transactions.map(t => [
            t.date,
            formatTaxType(t.type),
            t.amount,
            t.description.replace(/,/g, ";") // Replace commas to avoid CSV issues
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tax-analysis-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    function exportToPDF(results) {
        // Simple PDF export using browser's print functionality
        // Create a new window with print-friendly content
        const printWindow = window.open("", "_blank");
        const printContent = generatePrintContent(results);
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    function generatePrintContent(results) {
        const transactionRows = results.transactions.map(t => `
            <tr>
                <td>${t.date}</td>
                <td>${formatTaxType(t.type)}</td>
                <td>₹${t.amount.toLocaleString("en-IN")}</td>
                <td>${t.description}</td>
            </tr>
        `).join("");

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Tax Analysis Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .summary { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .total { font-size: 18px; font-weight: bold; color: #059669; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Tax Lens - Analysis Report</h1>
                    <p>File: ${results.fileName}</p>
                    <p>Generated on: ${new Date().toLocaleDateString("en-IN")}</p>
                </div>
                
                <div class="summary">
                    <h2>Summary</h2>
                    <p class="total">Total Tax Paid: ₹${results.totalTax.toLocaleString("en-IN")}</p>
                    <p>Total Transactions: ${results.count}</p>
                </div>

                <h2>Detailed Transactions</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Tax Type</th>
                            <th>Amount</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactionRows}
                    </tbody>
                </table>
                
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    This report was generated by Tax Lens for informational purposes only.
                </p>
            </body>
            </html>
        `;
    }
});
