import { LibraryBase } from "./library-base";
import { Customization } from './customization';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
    Paper,
    TablePagination,
    TableSortLabel,
    Chip,
    Card,
    CardHeader,
    CardContent,
    Button,
    Box,
    Typography
} from '@mui/material';

// Expected structure and types for dataset and columns
interface DataSetColumn {
    ColumnName: string;
    ColumnType: string;
    LogicalColumnName: string;
    BusinessDescription: string;
    ExampleValue: string;
    Tokenise: boolean;
    TokenIdentifierType: number;
    Redact: boolean;
    DisplayOrder: number;
    DataSetColumnID: number;
    DataSetID: number;
}

interface DataSetMetadata {
    Name: string;
    Description: string;
    DataSourceID: number;
    IsActive: boolean;
    Approvers: string;
    OptOutMessage: string | null;
    OptOutList: string;
    Owner: string;
    OptOutColumn: string;
    DataSetID: number;
    ModifiedDate: string;
    DataSetColumns?: DataSetColumn[];
}

interface ColumnsResponse {
    CurrentPage: number;
    PageCount: number;
    PageSize: number;
    RowCount: number;
    FirstRowOnPage: number;
    LastRowOnPage: number;
    Results: DataSetColumn[];
}

interface ProjectResponse {
    CurrentPage: number;
    PageCount: number;
    PageSize: number;
    RowCount: number;
    FirstRowOnPage: number;
    LastRowOnPage: number;
    Results: {
        AssistProjectID: number;
        Name: string;
        Description: string;
        IsActive: boolean;
        ModifiedDate: string;
        LoomeAssistTenantsID: string;
    }[];
}

class CustomEmbed extends LibraryBase {
    public token: string = "";
    private allColumns: DataSetColumn[] = [];
    private currentSortColumn: string = "name";
    private currentSortDirection: "asc" | "desc" = "asc";
    private currentPage: number = 1;
    private rowsPerPage: number = 10;
    private dataSet: DataSetMetadata | null = null;


    constructor(element: HTMLElement, entityUrl: string, params: Customization.ParamValue[], settings: Customization.Setting[],
        errorCallback: (title: string, subTitle: string, message: string, element: HTMLElement) => void) {
        super(element, entityUrl, params, settings, errorCallback);
        this.initialize();
    }

    public initialize = async (): Promise<void> => {
        this.disableBrowserCache();

        await this.buildPage();
    }

    public getAccessToken = async (): Promise<void> => {
        try {
            const authId = this.getParamValue('ApiAuthRequestId')?.value
            const authResponse = await window.loomeApi.runApiRequest(authId);
            this.token = authResponse.access_token;
        }
        catch (ex: unknown) {
            console.log(ex);
            const error = ex as Error;
            this.errorCallback("Error", "Unable obtain access token", error.message, this.element)
        }
    }

    public buildPage = async (): Promise<void> => {
        try {
            this.dataSet = await window.loomeApi.runApiRequest(6, {
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });

            const columnsResponse: ColumnsResponse = await window.loomeApi.runApiRequest(7, {
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });

            this.allColumns = columnsResponse.Results ?
                columnsResponse.Results.sort((a: DataSetColumn, b: DataSetColumn) => a.DisplayOrder - b.DisplayOrder) :
                [];

            if (!this.dataSet) {
                throw new Error('Dataset information not available');
            }
            
            const datasetHtml = this.generateMainLayout(this.dataSet);
            const styles = this.generateStyles();

            this.element.innerHTML = styles + datasetHtml;

            this.setupEventListeners();
            this.updateTable();
        } catch (ex: unknown) {
            console.error("Error:", ex);
            const error = ex as Error;
            if (error && error.message) {
                this.errorCallback("Error", "Failed to build the dataset page", error.message, this.element);
            }
        }
    }

    private generateMainLayout(dataSet: DataSetMetadata): string {
        return `
            <div id="datasetRoot">
                <!-- Modal -->
                <div id="requestDatasetModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Request Data Set</h3>
                            <span class="modal-close">&times;</span>
                        </div>
                        <div class="modal-body">
                            <form id="requestForm" class="request-form">
                                <div class="form-group">
                                    <label for="RequestName">Request Name</label>
                                    <input id="RequestName" class="form-input" placeholder="Name for this request" required>
                                </div>
                                <div class="form-group">
                                    <label for="RequestDescription">Description</label>
                                    <input id="RequestName" class="form-input" placeholder="Description for this request" required>
                                </div>
                                <div class="form-group">
                                    <label for="ProjectID">Assist Project</label>
                                    <select id="ProjectID" class="form-select" required>
                                        <option value="">Select a Project</option>
                                        <option value="82">Project 1</option>
                                        <option value="84">Project 2</option>
                                        <option value="85">Project 3</option>
                                    </select>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="button button-primary">Submit Request</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="mui-card">
                    <div class="card-header">
                        <div class="header-content">
                            <h2>${dataSet.Name}</h2>
                            <button id="requestDatasetBtn">
                                <span class="material-icons">data_exploration</span>
                                Request Data Set
                            </button>
                        </div>
                        <div class="metadata">
                            <div class="chips">
                                <span class="mui-chip">ID: ${dataSet.DataSetID}</span>
                                <span class="mui-chip">Owner: ${dataSet.Owner}</span>
                                <span class="mui-chip">Modified: ${new Date(dataSet.ModifiedDate).toLocaleDateString()}</span>
                            </div>
                            <p>${dataSet.Description}</p>
                        </div>
                    </div>
                </div>

                <div class="mui-card table-card">
                    <div class="table-container">
                        <table id="dataTable">
                            <thead>
                                <tr>
                                    <th data-sort="ColumnName">Column Name</th>
                                    <th data-sort="ColumnType">Data Type</th>
                                    <th data-sort="LogicalColumnName">Logical Name</th>
                                    <th data-sort="BusinessDescription">Description</th>
                                    <th data-sort="ExampleValue">Example</th>
                                    <th data-sort="Redact">Redacted</th>
                                    <th data-sort="Tokenise">Tokenized</th>
                                </tr>
                            </thead>
                            <tbody id="columnsTableBody"></tbody>
                        </table>
                    </div>
                    <div class="table-pagination">
                        <div class="pagination-controls">
                            <div class="pagination-info"></div>
                            <div class="pagination-actions">
                                <select id="pageSize" class="rows-select">
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                                <button class="prev-page">Previous</button>
                                <button class="next-page">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    
    private generateStyles(): string {
        if (!document.querySelector('#material-icons-font')) {
            const link = document.createElement('link');
            link.id = 'material-icons-font';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
            document.head.appendChild(link);
        }
        return `
            <style>
                #datasetRoot {
                    padding: 24px;
                    font-family: "Roboto", "Helvetica", "Arial";
                }
                .mui-card {
                    background: #fff;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin-bottom: 24px;
                }
                .card-header {
                    padding: 16px 24px;
                }
                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header-content h2 {
                    font-weight: 700;
                    font-size: 1.5rem;
                    margin: 0;
                    color: #2c3e50;
                }
                .metadata {
                    margin-top: 16px;
                }
                .chips {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .mui-chip {
                    background: #e0e0e0;
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 0.875rem;
                }
                .table-container {
                    overflow-x: auto;
                    max-height: 500px;
                    overflow-y: auto;
                }
                #dataTable {
                    width: 100%;
                    border-collapse: collapse;
                }
                #dataTable th {
                    background: #f5f5f5;
                    padding: 16px;
                    text-align: left;
                    font-weight: 700;
                    cursor: pointer;
                    color: #2c3e50;
                    font-size: 0.95rem;
                    // position: sticky;
                    // top: 0;
                }
                #dataTable td {
                    padding: 16px;
                    border-bottom: 1px solid #e0e0e0;
                }
                .table-pagination {
                    padding: 16px;
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                }
                #requestDatasetBtn {
                    padding: 8px 16px;
                    background: #4EC4BC;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 4px rgba(0,0,0,0.1);
                    font-size: 15px;
                }
                #requestDatasetBtn .material-icons {
                    font-size: 20px;
                }
                #requestDatasetBtn:hover {
                    filter: brightness(0.9);
                    transform: scale(1.05);
                    transition: transform 0.2s;
                }
                .pagination-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                }
                .pagination-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .rows-select {
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid #e0e0e0;
                    margin-right: 16px;
                }
                .prev-page, .next-page {
                    padding: 4px 12px;
                    border: 1px solid #e0e0e0;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .prev-page:hover, .next-page:hover {
                    background: #f5f5f5;
                }
                .prev-page.disabled, .next-page.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .code-cell {
                    font-family: monospace;
                    background: #f5f5f5;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                /* Modal styles */
                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 1000;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .modal.show {
                    display: flex;
                    opacity: 1;
                    align-items: center;
                    justify-content: center;
                }

                .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    transform: translateY(-20px);
                    transition: transform 0.3s ease;
                }

                .modal.show .modal-content {
                    transform: translateY(0);
                }

                .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #2c3e50;
                    font-weight: 600;
                }

                .modal-close {
                    font-size: 1.5rem;
                    color: #666;
                    cursor: pointer;
                    padding: 4px;
                    line-height: 1;
                }

                .modal-close:hover {
                    color: #333;
                }

                .modal-body {
                    padding: 24px;
                }

                .request-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-group label {
                    font-weight: 500;
                    color: #2c3e50;
                }

                .form-input, .form-select {
                    padding: 8px 12px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    font-size: 1rem;
                }

                .form-input:focus, .form-select:focus {
                    border-color: #4EC4BC;
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(78,196,188,0.2);
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 12px;
                }

                .button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                }

                .button-primary {
                    background: #4EC4BC;
                    color: white;
                }

                .button-primary:hover {
                    filter: brightness(0.9);
                }

                .button-secondary {
                    background: #e0e0e0;
                    color: #333;
                }

                .button-secondary:hover {
                    background: #d0d0d0;
                }
            </style>
        `;
    }

    public setupEventListeners = (): void => {
        try {
            // Sort headers
            const headers = document.querySelectorAll('#dataTable th[data-sort]');
            headers.forEach(header => {
                header.addEventListener('click', () => {
                    const sortType = header.getAttribute('data-sort');
                    if (sortType) {
                        if (this.currentSortColumn === sortType) {
                            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
                        } else {
                            this.currentSortColumn = sortType;
                            this.currentSortDirection = 'asc';
                        }
                        this.currentPage = 1;
                        this.updateTable();
                    }
                });
            });

            // Page size selector
            const pageSize = document.getElementById('pageSize');
            if (pageSize) {
                pageSize.addEventListener('change', (e) => {
                    const newSize = parseInt((e.target as HTMLSelectElement).value);
                    if (!isNaN(newSize)) {
                        this.rowsPerPage = newSize;
                        this.currentPage = 1;
                        this.updateTable();
                    }
                });
            }

            // Navigation buttons
            const prevBtn = document.querySelector('.prev-page');
            const nextBtn = document.querySelector('.next-page');

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (this.currentPage > 1) {
                        this.currentPage--;
                        this.updateTable();
                    }
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const totalPages = Math.ceil(this.allColumns.length / this.rowsPerPage);
                    if (this.currentPage < totalPages) {
                        this.currentPage++;
                        this.updateTable();
                    }
                });
            }

            // Request Dataset button
            const requestBtn = document.getElementById('requestDatasetBtn') as HTMLButtonElement;
            if (requestBtn) {
                requestBtn.addEventListener('click', async () => {
                    console.log('Button clicked, attempting to fetch projects...');
                    requestBtn.disabled = true;
                    try {
                        console.log('Before API call');
                        await this.createRequestModal();
                        console.log('After API call');
                    } catch (error) {
                        console.error('Error in button click handler:', error);
                    } finally {
                        requestBtn.disabled = false;
                    }
                });
            }

            const requestForm = document.getElementById('requestForm');
            if (requestForm) {
                requestForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    try {
                        if (!this.dataSet) {
                            throw new Error('Dataset information not available');
                        }

                        const formData = {
                            requestName: (document.getElementById('RequestName') as HTMLInputElement)?.value,
                            projectId: (document.getElementById('ProjectID') as HTMLSelectElement)?.value,
                            description: (document.getElementById('RequestDescription') as HTMLInputElement)?.value,
                            datasetId: this.dataSet.DataSetID,
                            approvers: this.dataSet.Approvers,
                        };

                        await window.loomeApi.runApiRequest(17, {
                            DataSetID: formData.datasetId,
                            approvers: formData.approvers,
                            assistProjectID: parseInt(formData.projectId),
                            description: formData.description,
                            requestName: formData.requestName,
                        });
                        
                        alert('Request submitted successfully!');
                        
                        // Close the modal on success
                        const modal = document.getElementById('requestDatasetModal');
                        if (modal) modal.classList.remove('show');

                    } catch (error) {
                        console.error('Error submitting request:', error);
                        alert('Failed to submit request. Please try again.');
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }



    private updateTable = (): void => {
        const tbody = document.getElementById('columnsTableBody');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        const paginatedColumns = this.allColumns.slice(startIndex, endIndex);

        let columnsHtml = '';
        paginatedColumns.forEach((column: DataSetColumn) => {
            columnsHtml += `
                <tr>
                    <td>${column.ColumnName || ''}</td>
                    <td><span class="mui-chip">${column.ColumnType || ''}</span></td>
                    <td>${column.LogicalColumnName || ''}</td>
                    <td>${column.BusinessDescription || 'N/A'}</td>
                    <td><span class="code-cell">${column.ExampleValue || 'N/A'}</span></td>
                    <td>${column.Redact ? '<span class="mui-chip success">Yes</span>' : '<span class="mui-chip">No</span>'}</td>
                    <td>${column.Tokenise ? '<span class="mui-chip success">Yes</span>' : '<span class="mui-chip">No</span>'}</td>
                </tr>
            `;
        });
        tbody.innerHTML = columnsHtml;

        try {
            this.updateSortIcons();
            
            // Update page size display
            const pageSizeSelect = document.getElementById('pageSize');
            if (pageSizeSelect) {
                (pageSizeSelect as HTMLSelectElement).value = this.rowsPerPage.toString();
            }

            // Update pagination info in table footer
            const paginationInfo = document.querySelector('.pagination-info');
            if (paginationInfo) {
                const startIndex = (this.currentPage - 1) * this.rowsPerPage + 1;
                const endIndex = Math.min(startIndex + this.rowsPerPage - 1, this.allColumns.length);
                paginationInfo.innerHTML = `
                    Showing ${startIndex} to ${endIndex} of ${this.allColumns.length} entries
                `;
            }
        } catch (error) {
            console.error('Error updating table UI:', error);
        }
    }

    private updateSortIcons = (): void => {
        document.querySelectorAll('.table th.sortable i').forEach(icon => {
            icon.classList.remove('bi-sort-up', 'bi-sort-down');
            icon.classList.add('bi-sort');
        });

        const sortedHeader = document.querySelector(`.table th[data-sort="${this.currentSortColumn}"] i`);
        if (sortedHeader) {
            sortedHeader.classList.remove('bi-sort');
            sortedHeader.classList.add(this.currentSortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down');
        }
    }

    private updatePaginationButtons = (): void => {
        const totalPages = Math.ceil(this.allColumns.length / this.rowsPerPage);
        
        // Update navigation buttons
        const prevPageBtn = document.querySelector('.prev-page');
        const nextPageBtn = document.querySelector('.next-page');
        
        if (prevPageBtn) {
            prevPageBtn.classList.toggle('disabled', this.currentPage === 1);
        }
        if (nextPageBtn) {
            nextPageBtn.classList.toggle('disabled', this.currentPage >= totalPages);
        }
    }



    private createRequestModal = async (): Promise<void> => {
        const modal = document.getElementById('requestDatasetModal');
        if (!modal) return;

        try {
            console.log('Fetching projects...');
            const projectsResponse = await window.loomeApi.runApiRequest(9, {});

            if (!projectsResponse || !Array.isArray(projectsResponse.Results)) {
                throw new Error(`Invalid API response structure.`);
            }

            const projectSelect = document.getElementById('ProjectID') as HTMLSelectElement;
            if (!projectSelect) {
                throw new Error('Project select element not found');
            }

            const defaultOption = projectSelect.options[0];
            projectSelect.innerHTML = '';
            projectSelect.appendChild(defaultOption);

            projectsResponse.Results.forEach((project: ProjectResponse['Results'][0]) => {
                if (project.IsActive) {
                    const option = document.createElement('option');
                    option.value = project.AssistProjectID.toString();
                    option.textContent = project.Name;
                    option.title = project.Description || '';
                    projectSelect.appendChild(option);
                }
            });

            modal.classList.add('show');
            
            const closeModal = () => modal.classList.remove('show');

            const closeButtons = modal.querySelectorAll('.modal-close');
            closeButtons.forEach(button => button.addEventListener('click', closeModal));

            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

        } catch (error) {
            console.error('Error in createRequestModal:', error);
            console.error('Full error details:', {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            
            if (error instanceof Error) {
                this.errorCallback(
                    "Error", 
                    "Failed to load projects", 
                    `Error details: ${error.message}`, 
                    this.element
                );
            }
        }
    }

    private disableBrowserCache(): void {
        const head = document.head;
        const metaTags = [
            { 'http-equiv': 'Cache-Control', 'content': 'no-cache, no-store, must-revalidate' },
            { 'http-equiv': 'Pragma', 'content': 'no-cache' },
            { 'http-equiv': 'Expires', 'content': '0' }
        ];

        metaTags.forEach(tagInfo => {
            // Check if a similar tag already exists to avoid duplicates
            if (!document.querySelector(`meta[http-equiv="${tagInfo['http-equiv']}"]`)) {
                const meta = document.createElement('meta');
                meta.setAttribute('http-equiv', tagInfo['http-equiv']);
                meta.setAttribute('content', tagInfo['content']);
                head.appendChild(meta);
            }
        });
    }

    private async loadResources(): Promise<void> {
        return Promise.resolve();
    }
}

export const definition: Customization.CustomizationLibrary = {
    version: "1.0.0",
    embedding: {
        destroy: (element: Customization.HTMLElementWithCleanup): void => {
            element.innerHTML = "";
            const embedInstance = element.instance;
            if (embedInstance) {
                embedInstance.dispose();
                delete element.instance; 
                console.log('Instance disposed.')
            }
        },
        run: (element: Customization.HTMLElementWithCleanup, entityUrl: string, paramValues: Customization.ParamValue[], settings: Customization.Setting[],
                errorCallback: (title: string, subTitle: string, message: string, element: Customization.HTMLElementWithCleanup) => void): void => {
                const instance = new CustomEmbed(element, entityUrl, paramValues, settings, errorCallback);
                element.instance = instance;
            }
    }
};