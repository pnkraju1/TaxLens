// CSV parsing functionality using Papa Parse
class CSVParser {
    constructor() {
        this.papaparse = null;
        this.isLibraryLoaded = false;
    }

    async loadLibrary() {
        if (this.isLibraryLoaded) return;
        
        // Load Papa Parse from CDN
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js";
            script.onload = ( ) => {
                this.papaparse = window.Papa;
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
            
            return new Promise((resolve) => {
                this.papaparse.parse(file, {
                    header: true, // Use first row as headers
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length > 0) {
                            console.warn("CSV parsing warnings:", results.errors);
                        }
                        
                        resolve({
                            success: true,
                            data: results.data,
                            headers: results.meta.fields,
                            rows: results.data.length
                        });
                    },
                    error: (error) => {
                        resolve({
                            success: false,
                            error: error.message,
                            data: []
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error("CSV parsing error:", error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }
}

// Export for use in other scripts
window.CSVParser = CSVParser;
