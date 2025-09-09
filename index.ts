import { LibraryBase } from "./library-base";
import { Customization } from './customization';
import { getDatasetTemplate } from './src/templates/dataset.template';
import { datasetStyles } from './src/styles/dataset.styles';


class CustomEmbed extends LibraryBase {
    protected token: string = "";

    constructor(element: HTMLElement, entityUrl: string, params: Customization.ParamValue[], settings: Customization.Setting[],
        errorCallback: (title: string, subTitle: string, message: string, element: HTMLElement) => void) {
        super(element, entityUrl, params, settings, errorCallback);    
        console.log(params)
        this.loadResources();
    }

    private loadResources = async (): Promise<void> => {
        // await this.getAccessToken();
        await this.buildPage();
    }

    protected getAccessToken = async (): Promise<void> => {
        try {
            // A way to get the runtime param passed down from the portal
            const authId = this.getParamValue('ApiAuthRequestId')?.value

            const authResponse = await window.loomeApi.runApiRequest(authId);
            this.token = authResponse.access_token;
        }
        catch (ex: unknown) {
            // Additional debug logs, won't hurt to get additional raw info
            console.log(ex);
            const error = ex as Error;
            this.errorCallback("Error", "Unable obtain access token", error.message, this.element)
        }
    }

    protected buildPage = async (): Promise<void> => {
        try {
            const DataSet = await window.loomeApi.runApiRequest(6, {
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });
            
            let columnsHtml = '';
            if (DataSet.DataSetColumns && Array.isArray(DataSet.DataSetColumns)) {
                // ...existing columnsHtml generation...
            }
            
            // Use the imported template and styles
            const datasetHtml = getDatasetTemplate(DataSet, columnsHtml);
            
            // Set the innerHTML with imported styles
            this.element.innerHTML = datasetStyles + datasetHtml;

            
            // --- 4. Add event handlers after rendering ---
            setTimeout(() => {
                // Get the modal elements
                const requestDatasetModal = document.getElementById('requestDatasetModal');
                
                // Get the buttons that open the modals
                const requestDatasetBtn = document.getElementById('requestDatasetBtn');
                const exportBtn = document.getElementById('exportBtn');
                
                // Get the <span> elements that close the modals
                const closeButtons = document.getElementsByClassName('close');

                
                // Table sorting variables
                let currentSortColumn = "name";
                let currentSortDirection = "desc";
                
                // Function to sort table
                function sortTable(tableId: string, columnIndex: number, columnName: string): void {
                    const table = document.getElementById(tableId);
                    if (!table) return;
                    
                    const tbody = table.querySelector('tbody');
                    if (!tbody) return;
                    
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    
                    // Update sort indicators
                    const headers = table.querySelectorAll('th.sortable');
                    headers.forEach(header => {
                        const indicator = header.querySelector('.sort-indicator');
                        if (indicator) {
                            indicator.textContent = '';
                        }
                        header.removeAttribute('data-sort-direction');
                    });
                    
                    // Determine sort direction
                    if (currentSortColumn === columnName) {
                        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSortColumn = columnName;
                        currentSortDirection = 'asc';
                    }
                    
                    // Update current header
                    const currentHeader = table.querySelector(`th[data-sort="${columnName}"]`);
                    if (currentHeader) {
                        const indicator = currentHeader.querySelector('.sort-indicator');
                        if (indicator) {
                            indicator.textContent = currentSortDirection === 'asc' ? '▲' : '▼';
                        }
                        currentHeader.setAttribute('data-sort-direction', currentSortDirection);
                    }
                    
                    // Sort the rows
                    rows.sort((a, b) => {
                        const aValue = (a.cells[columnIndex].textContent || '').trim();
                        const bValue = (b.cells[columnIndex].textContent || '').trim();
                        
                        // Determine if we're sorting a data type column
                        if (columnName === 'type') {
                            // Special comparison for data types
                            return currentSortDirection === 'asc' 
                                ? aValue.localeCompare(bValue) 
                                : bValue.localeCompare(aValue);
                        }
                        
                        // Default comparison
                        return currentSortDirection === 'asc' 
                            ? aValue.localeCompare(bValue) 
                            : bValue.localeCompare(aValue);
                    });

                }
                
                // Function to export table data to CSV
                function exportTableToCSV(tableId: string, filename: string = ''): void {
                    const table = document.getElementById(tableId);
                    if (!table) return;
                    
                    // Generate filename if not provided
                    if (!filename) {
                        const date = new Date().toISOString().slice(0, 10);
                        filename = `Dataset_${DataSet.DataSetID}_${date}.csv`;
                    }
                    
                    // Get all rows
                    const rows = table.querySelectorAll('tr');
                    
                    // Prepare CSV content
                    const csvContent: string[] = [];
                    
                    // Process each row
                    rows.forEach(row => {
                        const rowData: string[] = [];
                        const cells = row.querySelectorAll('th, td');
                        
                        cells.forEach(cell => {
                            // Get text content and escape quotes
                            let text = (cell.textContent || '').trim().replace(/"/g, '""');
                            // Wrap in quotes to handle commas
                            rowData.push(`"${text}"`);
                        });
                        
                        csvContent.push(rowData.join(','));
                    });
                    
                    // Create CSV content
                    const csvData = csvContent.join('\\n');
                    
                    // Create download link
                    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    
                    // Set up download
                    if ('msSaveBlob' in navigator) { // For IE
                        (navigator as any).msSaveBlob(blob, filename);
                    } else {
                        // For other browsers
                        link.href = URL.createObjectURL(blob);
                        link.setAttribute('download', filename);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }
                

                
                // Function to create a dataset request
                function CreateRequest() {
                    // Get the modal's body element
                    const modalBody = document.getElementById('requestDatasetModalBody');
                    
                    if (!modalBody || !requestDatasetModal) return;
                    
                    // Create the form for the request
                    const formHtml = `
                        <div class="col-md-12">
                            <form id="requestForm">
                                <!-- Request Name Field -->
                                <div class="form-group">
                                    <label for="RequestName" class="control-label">Request Name</label>
                                    <input id="RequestName" class="form-control" placeholder="Name for this request" required>
                                </div>

                                <!-- Assist Project Field -->
                                <div class="form-group" >
                                    <label for="ProjectID" class="control-label">Assist Project</label>
                                    <select id="ProjectID" class="form-select" required>
                                        <option value="">Select a Project</option>
                                        <option value="82">Project 1</option>
                                        <option value="84">Project 2</option>
                                        <option value="85">Project 3</option>
                                        <option value="86">Project 4</option>
                                    </select>
                                    <div class="validation-message"></div>
                                </div>
                                
                                <!-- Scheduled Refresh Field -->
                                <div class="form-group">
                                    <label for="ScheduleRefresh" class="control-label">Scheduled Refresh</label>
                                    <select id="ScheduleRefresh" class="form-select">
                                        <option value="No Refresh">No Refresh</option>
                                        <option value="Daily">Daily</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                    </select>
                                </div>

                                <!-- Action Buttons -->
                                <div class="form-group">
                                    <button type="submit" class="btn btn-accent">Save</button>
                                    <button type="button" class="btn btn-default" id="cancelRequest">Cancel</button>
                                </div>
                            </form>
                        </div>
                        <div style="text-align: right; margin-top: 20px;">
                            <button id="exportRequestBtn" class="btn btn-export">
                                <i class="icon-download"></i> Export to CSV
                            </button>
                        </div>

                    `;
                    
                    // Set the content and display the modal
                    modalBody.innerHTML = formHtml;
                    
                    // Initialize Bootstrap modal
                    const modal = new (window as any).bootstrap.Modal(requestDatasetModal);
                    modal.show();
                    
                    // Add event listener for the form submission
                    const requestForm = document.getElementById('requestForm');
                    if (requestForm) {
                        requestForm.addEventListener('submit', function(e) {
                            e.preventDefault();
                            alert('Request submitted successfully!');
                            if (requestDatasetModal) {
                                requestDatasetModal.style.display = 'none';
                            }
                        });
                    }
                    
                    // Add event listener for the cancel button
                    const cancelButton = document.getElementById('cancelRequest');
                    if (cancelButton) {
                        cancelButton.addEventListener('click', function() {
                            if (requestDatasetModal) {
                                requestDatasetModal.style.display = 'none';
                            }
                        });
                    }
                    
                    // Add event listener for the export button
                    const exportRequestBtn = document.getElementById('exportRequestBtn');
                    if (exportRequestBtn) {
                        exportRequestBtn.addEventListener('click', function() {
                            const date = new Date().toISOString().slice(0, 10);
                            const csvContent = `"Request Name","Project","Scheduled Refresh"\n"Request for ${DataSet.Name}","Project 1","Weekly"`;
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.setAttribute('download', `DatasetRequest_${DataSet.DataSetID}_${date}.csv`);
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);

                        });
                    }
                }
                

                
                if (requestDatasetBtn) {
                    requestDatasetBtn.addEventListener('click', CreateRequest);
                }
                

                if (exportBtn) {
                    exportBtn.addEventListener('click', function() {
                        const date = new Date().toISOString().slice(0, 10);
                        exportTableToCSV('columnsTableBody', `Dataset_${DataSet.DataSetID}_${date}.csv`);
                    });
                }
                


                
                // Add sorting to the main table
                const mainTableHeaders = document.querySelectorAll('.columns-table th.sortable');

                mainTableHeaders.forEach((header, index) => {
                    header.addEventListener('click', function(this: HTMLElement) {
                        const sortType = this.getAttribute('data-sort');
                        if (sortType) {
                            sortTable('columnsTableBody', index, sortType);
                        }
                    });
                });
                

                // When the user clicks on <span> (x), close the modal
                for (let i = 0; i < closeButtons.length; i++) {
                    closeButtons[i].addEventListener('click', function() {
                        if (requestDatasetModal) {
                            requestDatasetModal.style.display = 'none';
                        }
                    });
                }
                
                // When the user clicks anywhere outside of the modal, close it
                window.addEventListener('click', function(event) {
                    if (event.target === requestDatasetModal && requestDatasetModal) {
                        requestDatasetModal.style.display = 'none';
                    }
                });
                

                // Initialize with default sort
                sortTable('columnsTableBody', 0, 'name');
                
            }, 100); // Small delay to ensure DOM is ready

        } catch (ex: unknown) {
            console.error("Error:", ex);
            const error = ex as Error;
            if (error && error.message) {
                this.errorCallback("Error", "Failed to build the dataset page", error.message, this.element);
            }
        }
    }
}

export const definition: Customization.CustomizationLibrary = {
    version: "1.0.0",
    embedding: {
        destroy: (element: Customization.HTMLElementWithCleanup): void => {
            // Clear out the contents of the element
            element.innerHTML = "";

            // Grab the instance we saved earlier on the element
            const embedInstance = element.instance;
            if (embedInstance) {
                // Call the dispose on the instance first
                embedInstance.dispose();
                // Then clean up the reference
                delete element.instance; 
                console.log('Instance disposed.')
            }
        },
        run: (element: Customization.HTMLElementWithCleanup, entityUrl: string, paramValues: Customization.ParamValue[], settings: Customization.Setting[],
                errorCallback: (title: string, subTitle: string, message: string, element: Customization.HTMLElementWithCleanup) => void): void => {
                const instance = new CustomEmbed(element, entityUrl, paramValues, settings, errorCallback);
                // Store for proper disposal later when the destroy is called
                element.instance = instance;
            }
    }
};