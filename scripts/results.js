document.addEventListener('DOMContentLoaded', () => {
    const resultsData = JSON.parse(sessionStorage.getItem('taxAnalysisResult'));

    if (!resultsData) {
        // Redirect to home if no data is found
        window.location.href = 'index.html';
        return;
    }

    // Display basic info
    document.getElementById('file-name').textContent = resultsData.fileName;
    document.getElementById('analysis-date').textContent = new Date(resultsData.analysisDate).toLocaleDateString();

    // Display summary cards
    document.getElementById('total-tax').textContent = `₹${resultsData.totalTax.toFixed(2)}`;
    document.getElementById('total-transactions').textContent = resultsData.count;

    // Determine highest tax type
    let highestTaxType = 'N/A';
    let maxTaxAmount = 0;
    for (const type in resultsData.byType) {
        if (resultsData.byType[type].total > maxTaxAmount) {
            maxTaxAmount = resultsData.byType[type].total;
            highestTaxType = type;
        }
    }
    document.getElementById('highest-tax-type').textContent = highestTaxType;

    // Populate detailed transactions table
    const transactionsTableBody = document.getElementById('transactions-table-body');
    if (resultsData.transactions && resultsData.transactions.length > 0) {
        resultsData.transactions.forEach(transaction => {
            const row = transactionsTableBody.insertRow();
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${transaction.date || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.description || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.type || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹${transaction.amount ? transaction.amount.toFixed(2) : '0.00'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.source || 'N/A'}</td>
            `;
        });
    } else {
        document.getElementById('no-transactions-message').classList.remove('hidden');
    }

    // Render charts
    renderTaxTypeChart(resultsData.byType);
    renderMonthlyTaxChart(resultsData.byMonth);

    // Export CSV Button
    document.getElementById('export-csv-btn').addEventListener('click', () => {
        exportCSV(resultsData.transactions);
    });

    // Export PDF Button (Placeholder for now)
    document.getElementById('export-pdf-btn').addEventListener('click', () => {
        alert('PDF export is not yet implemented.');
    });
});

function renderTaxTypeChart(byTypeData) {
    const ctx = document.getElementById('taxTypeChart').getContext('2d');
    const labels = Object.keys(byTypeData);
    const data = labels.map(label => byTypeData[label].total);
    const backgroundColors = [
        '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#00BCD4', '#8BC34A', '#FFEB3B', '#E91E63'
    ];

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'Tax Breakdown by Type'
                }
            }
        }
    });
}

function renderMonthlyTaxChart(byMonthData) {
    const ctx = document.getElementById('monthlyTaxChart').getContext('2d');
    const sortedMonths = Object.keys(byMonthData).sort((a, b) => new Date(a) - new Date(b));
    const data = sortedMonths.map(month => byMonthData[month]);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Tax Paid (₹)',
                data: data,
                backgroundColor: '#4CAF50',
                borderColor: '#388E3C',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false,
                    text: 'Monthly Tax Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount (₹)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            }
        }
    });
}

function exportCSV(transactions) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Description,Category,Tax Amount (INR),Source\n";

    transactions.forEach(transaction => {
        const row = [
            `"${transaction.date || ''}"`,
            `"${transaction.description ? transaction.description.replace(/"/g, '""') : ''}"`,
            `"${transaction.type || ''}"`,
            `"${transaction.amount ? transaction.amount.toFixed(2) : '0.00'}"`,
            `"${transaction.source || ''}"`
        ];
        csvContent += row.join(',') + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tax_lens_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
