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

const API_GET_DATASET_METADATA = 'GetDataSetID';
const API_GET_DATASET_COLUMNS = 'GetDatasetIDColumns';
const API_SUBMIT_DATASET_REQUEST = 'RequestDataSet';
const API_GET_PROJECTS = 'GetAssistProjectsFilteredByUpn';

class CustomEmbed extends LibraryBase {
    public token: string = "";
    private allColumns: DataSetColumn[] = [];
    private currentSortColumn: string = "ColumnName";
    private currentSortDirection: "asc" | "desc" = "asc";
    private currentPage: number = 1;
    private rowsPerPage: number = 10;
    private dataSet: DataSetMetadata | null = null;
    private columnNameSearchTerm: string = "";
    private selectedColumnNames: Set<string> = new Set();
    private columnNameSortDirection: "asc" | "desc" = "asc";
    private redactedFilter: 'all' | 'yes' | 'no' = 'all';
    private deidentifiedFilter: 'all' | 'yes' | 'no' = 'all';


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
            this.dataSet = await window.loomeApi.runApiRequest(API_GET_DATASET_METADATA, { //GetDataSetID
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });

            const columnsResponse: ColumnsResponse = await window.loomeApi.runApiRequest(API_GET_DATASET_COLUMNS, { //GetDatasetIDColumns
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });

            this.allColumns = columnsResponse.Results ?
                columnsResponse.Results.sort((a: DataSetColumn, b: DataSetColumn) => a.DisplayOrder - b.DisplayOrder) :
                [];

            // Initialize selected column names to all available options by default
            this.selectedColumnNames = new Set(this.getColumnNameOptions());

            if (!this.dataSet) {
                throw new Error('Dataset information not available');
            }

            
            const datasetHtml = this.generateMainLayout(this.dataSet);
            const styles = this.generateStyles();

            this.element.innerHTML = styles + datasetHtml;

            if (this.dataSet.IsActive == false) {
                const requestBtn = document.getElementById('requestDatasetBtn') as HTMLButtonElement;
                if (requestBtn) {
                    requestBtn.disabled = true;
                    requestBtn.textContent = "Data Set is Inactive";
                }
                alert("This dataset is currently inactive and cannot be requested. Please contact your platform administrator for more information.");
            }

            this.setupEventListeners();
            this.renderColumnNameCheckboxes();
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
                                <span class="mui-chip">Approver: ${dataSet.Approvers}</span>
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
                                    <th data-sort="ColumnName" class="column-name-header-cell">
                                        <div class="column-name-header">
                                            <span class="header-text" id="columnNameToggle" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false">
                                                Column Name
                                                <span class="filter-inline">
                                                    <span class="filter-count" id="columnNameFilterCount"></span>
                                                    <span class="material-icons dropdown-icon">filter_alt</span>
                                                </span>
                                            </span>
                                            <div class="dropdown" id="columnNameDropdown">
                                                <div class="dropdown-menu" id="columnNameDropdownMenu">
                                                    <div class="dropdown-search">
                                                        <input type="text" id="columnNameSearchInput" placeholder="Search columns" autocomplete="off">
                                                    </div>
                                                    <div class="column-name-sort-row">
                                                        <button type="button" data-action="sort-asc" title="Sort A-Z">A-Z</button>
                                                        <button type="button" data-action="sort-desc" title="Sort Z-A">Z-A</button>
                                                        <span style="flex:1"></span>
                                                    </div>
                                                    <div id="columnNameSelectAllContainer"></div>
                                                    <div class="dropdown-list" id="columnNameCheckboxList"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </th>
                                    <th data-sort="ColumnType">Data Type</th>
                                    <th data-sort="LogicalColumnName">Logical Name</th>
                                    <th data-sort="BusinessDescription">Description</th>
                                    <th data-sort="ExampleValue">Example</th>
                                    <th data-sort="Redact" class="header-filter-cell">
                                        <div class="header-filter">
                                            <span class="header-text">Redacted</span>
                                            <button type="button" id="redactedToggle" class="filter-icon" aria-haspopup="true" aria-expanded="false" title="Filter Redacted">
                                                <span class="material-icons">filter_list</span>
                                            </button>
                                            <div class="popover" id="redactedPopover">
                                                <div class="popover-option" data-value="yes">Yes</div>
                                                <div class="popover-option" data-value="no">No</div>
                                                <div class="popover-option" data-value="all">Show All</div>
                                            </div>
                                        </div>
                                    </th>
                                    <th data-sort="Tokenise" class="header-filter-cell">
                                        <div class="header-filter">
                                            <span class="header-text">Deidentified</span>
                                            <button type="button" id="deidentifiedToggle" class="filter-icon" aria-haspopup="true" aria-expanded="false" title="Filter Deidentified">
                                                <span class="material-icons">filter_list</span>
                                            </button>
                                            <div class="popover" id="deidentifiedPopover">
                                                <div class="popover-option" data-value="yes">Yes</div>
                                                <div class="popover-option" data-value="no">No</div>
                                                <div class="popover-option" data-value="all">Show All</div>
                                            </div>
                                        </div>
                                    </th>
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
                #entity-page-embed {
                    overflow:scroll;
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
                    // max-height: 500px;
                    // overflow-y: auto;
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
                .column-name-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .column-name-header .dropdown {
                    position: relative;
                }

                .dropdown-toggle {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    border-radius: 4px;
                    border: 1px solid #d0d7e0;
                    background: #f7f9fb;
                    font-size: 0.85rem;
                    cursor: pointer;
                    color: #22303f;
                }
                .header-text {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    user-select: none;
                    font-weight: 700;
                }
                .filter-inline {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-left: 8px;
                    font-weight: 600;
                }
                .filter-count {
                    font-size: 0.75rem;
                    color: #4ec4bc;
                }
                .dropdown-icon {
                    font-size: 16px;
                }
                .header-filter-cell {
                    vertical-align: middle;
                }
                .header-filter {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    position: relative;
                }
                .filter-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 34px;
                    height: 34px;
                    border-radius: 6px;
                    border: 1px solid transparent;
                    background: transparent;
                    cursor: pointer;
                }
                .filter-icon .material-icons {
                    font-size: 18px;
                    color: #6c7a86;
                }
                .filter-icon.filter-active .material-icons {
                    color: #4ec4bc;
                }
                .popover {
                    position: absolute;
                    top: calc(100% + 6px);
                    left: auto;
                    right: 0;
                    min-width: 120px;
                    width: auto;
                    max-width: 90vw;
                    background: #fff;
                    border: 1px solid #e0e0e0;
                    box-shadow: 0 12px 30px rgba(0,0,0,0.15);
                    border-radius: 6px;
                    padding: 8px 6px;
                    display: none;
                    z-index: 9999;
                    opacity: 0;
                    transform: translateY(-6px);
                    transition: opacity 160ms ease, transform 160ms ease;
                    will-change: transform, opacity;
                }

                .popover.show, .dropdown-menu.show {
                    display: block;
                    opacity: 1;
                    transform: translateY(0);
                }

                .popover-option {
                    padding: 8px 10px;
                    cursor: pointer;
                    border-radius: 4px;
                    font-size: 0.95rem;
                }
                .popover-option:hover {
                    background: #f3f6f7;
                }
                .popover-option.active {
                    background: #4ec4bc;
                    color: white;
                }
                .dropdown-menu {
                    position: absolute;
                    top: calc(100% + 6px);
                    right: 0;
                    width: 260px;
                    background: #fff;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    box-shadow: 0 12px 30px rgba(0,0,0,0.15);
                    padding: 12px;
                    display: none;
                    flex-direction: column;
                    gap: 8px;
                    z-index: 10;
                    opacity: 0;
                    transform: translateY(-6px);
                    transition: opacity 160ms ease, transform 160ms ease;
                    will-change: transform, opacity;
                    transform-origin: top right;
                }
                .dropdown-menu.show {
                    display: flex;
                    width: fit-content;
                }
                .dropdown-search input {
                    width: 100%;
                    padding: 6px 8px;
                    border-radius: 4px;
                    border: 1px solid #d0d7e0;
                    font-size: 0.9rem;
                }
                .column-name-sort-row {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    padding: 6px 2px;
                }
                .column-name-sort-row button {
                    background: #f3f6f7;
                    border: 1px solid #e0e6ea;
                    padding: 6px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.85rem;
                }
                .column-name-sort-row button:hover {
                    background: #e9f2f1;
                }
                .column-name-sort-row button.active {
                    background: #4ec4bc;
                    color: white;
                    border-color: #4ec4bc;
                }
                .dropdown-list {
                    max-height: 240px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: #1f2a37;
                }
                .dropdown-item input {
                    accent-color: #4ec4bc;
                }
                .dropdown-empty {
                    font-size: 0.8rem;
                    color: #616770;
                    padding: 4px 2px;
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
            // const headers = document.querySelectorAll('#dataTable th[data-sort]');
            // headers.forEach(header => {
            //     header.addEventListener('click', () => {
            //         const sortType = header.getAttribute('data-sort');
            //         if (sortType) {
            //             if (this.currentSortColumn === sortType) {
            //                 this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
            //             } else {
            //                 this.currentSortColumn = sortType;
            //                 this.currentSortDirection = 'asc';
            //             }
            //             this.currentPage = 1;
            //             this.updateTable();
            //         }
            //     });
            // });

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
                    const totalEntries = this.getFilteredColumns().length;
                    const totalPages = Math.max(1, Math.ceil(totalEntries / this.rowsPerPage));
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

                        await window.loomeApi.runApiRequest(API_SUBMIT_DATASET_REQUEST, {
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

            // Redacted popover toggle
            const redactedToggle = document.getElementById('redactedToggle');
            const redactedPopover = document.getElementById('redactedPopover');
            if (redactedToggle && redactedPopover) {
                const handleRedactedOptionClick = (event: Event) => {
                    const target = event.target as HTMLElement | null;
                    if (!target) {
                    return;
                    }
                    const value = target.getAttribute('data-value') as 'all' | 'yes' | 'no';
                    this.redactedFilter = value;
                    // Remove active from all, add to selected
                    redactedPopover.querySelectorAll('.popover-option').forEach(o => o.classList.remove('active'));
                    target.classList.add('active');
                    redactedToggle.classList.toggle('filter-active', value !== 'all');
                    this.updateTable();
                    redactedPopover.classList.remove('show');
                    redactedToggle.setAttribute('aria-expanded', 'false');
                };

                // Attach redacted popover option click listeners once
                redactedPopover.querySelectorAll('.popover-option').forEach(option => {
                    option.addEventListener('click', handleRedactedOptionClick);
                });

                redactedToggle.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const isVisible = redactedPopover.classList.contains('show');
                    if (!isVisible) {
                    redactedPopover.classList.add('show');
                    redactedToggle.setAttribute('aria-expanded', 'true');
                    } else {
                    redactedPopover.classList.remove('show');
                    redactedToggle.setAttribute('aria-expanded', 'false');
                    }
                });
            }
            // Deidentified popover toggle
            const deidentifiedToggle = document.getElementById('deidentifiedToggle');
            const deidentifiedPopover = document.getElementById('deidentifiedPopover');
            if (deidentifiedToggle && deidentifiedPopover) {
                const handleDeidentifiedOptionClick = (event: Event) => {
                    const target = event.target as HTMLElement | null;
                    if (!target) {
                    return;
                    }
                    const value = target.getAttribute('data-value') as 'all' | 'yes' | 'no';
                    this.deidentifiedFilter = value;

                    // Remove active from all, add to selected
                    deidentifiedPopover.querySelectorAll('.popover-option').forEach(o => o.classList.remove('active'));
                    target.classList.add('active');
                    deidentifiedToggle.classList.toggle('filter-active', value !== 'all');

                    this.updateTable();
                    deidentifiedPopover.classList.remove('show');
                    deidentifiedToggle.setAttribute('aria-expanded', 'false');
                };

                // Attach deidentified popover option click listeners once
                deidentifiedPopover.querySelectorAll('.popover-option').forEach(option => {
                    option.addEventListener('click', handleDeidentifiedOptionClick);
                });

                deidentifiedToggle.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const isVisible = deidentifiedPopover.classList.contains('show');
                    if (!isVisible) {
                    deidentifiedPopover.classList.add('show');
                    deidentifiedToggle.setAttribute('aria-expanded', 'true');
                    } else {
                    deidentifiedPopover.classList.remove('show');
                    deidentifiedToggle.setAttribute('aria-expanded', 'false');
                    }
                });
            }
            // Close popovers when clicking outside
            document.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                if (redactedPopover && redactedPopover.classList.contains('show') &&
                    !redactedPopover.contains(target) &&
                    redactedToggle && !redactedToggle.contains(target)) {
                    redactedPopover.classList.remove('show');
                    redactedToggle.setAttribute('aria-expanded', 'false');
                }
                if (deidentifiedPopover && deidentifiedPopover.classList.contains('show') &&
                    !deidentifiedPopover.contains(target) &&
                    deidentifiedToggle && !deidentifiedToggle.contains(target)) {
                    deidentifiedPopover.classList.remove('show');
                    deidentifiedToggle.setAttribute('aria-expanded', 'false');
                }
            });

            const searchInput = document.getElementById('columnNameSearchInput') as HTMLInputElement | null;
                if (searchInput) {
                    searchInput.addEventListener('input', () => {
                        this.columnNameSearchTerm = (searchInput.value || '').trim().toLowerCase();
                        this.renderColumnNameCheckboxes();
                    });
                }

            const columnDropdown = document.getElementById('columnNameDropdown');
            const dropdownMenu = columnDropdown?.querySelector('.dropdown-menu') as HTMLDivElement | null;
            const headerToggle = document.getElementById('columnNameToggle') as HTMLElement | null;

            if (headerToggle && dropdownMenu) {
                const toggleFn = (event: Event) => {
                    event.stopPropagation();
                    const isVisible = dropdownMenu.classList.toggle('show');
                    headerToggle.setAttribute('aria-expanded', String(isVisible));
                };

                headerToggle.addEventListener('click', toggleFn);
                headerToggle.addEventListener('keydown', (e) => {
                    if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
                        e.preventDefault();
                        toggleFn(e);
                    }
                });

                // Prevent clicks inside the dropdown from closing it
                dropdownMenu.addEventListener('click', (event) => event.stopPropagation());

                // Wire sort buttons inside dropdown
                const sortAscBtn = dropdownMenu.querySelector('button[data-action="sort-asc"]') as HTMLButtonElement | null;
                const sortDescBtn = dropdownMenu.querySelector('button[data-action="sort-desc"]') as HTMLButtonElement | null;
                const setSortButtonsState = () => {
                    if (sortAscBtn) sortAscBtn.classList.toggle('active', this.columnNameSortDirection === 'asc');
                    if (sortDescBtn) sortDescBtn.classList.toggle('active', this.columnNameSortDirection === 'desc');
                };

                if (sortAscBtn) {
                    sortAscBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.columnNameSortDirection = 'asc';
                        setSortButtonsState();
                        this.renderColumnNameCheckboxes();

                        this.currentPage = 1;
                        this.currentSortColumn = 'ColumnName';
                        this.currentSortDirection = 'asc';
                        this.updateTable();
                    });
                }
                if (sortDescBtn) {
                    sortDescBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.columnNameSortDirection = 'desc';
                        setSortButtonsState();
                        this.renderColumnNameCheckboxes();

                        this.currentPage = 1;
                        this.currentSortColumn = 'ColumnName';
                        this.currentSortDirection = 'desc';
                        this.updateTable();
                    });
                }
                setSortButtonsState();

                // Close when clicking outside
                document.addEventListener('click', () => {
                    dropdownMenu.classList.remove('show');
                    headerToggle.setAttribute('aria-expanded', 'false');
                });
            }


        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }


    private updateTable = (): void => {
        const tbody = document.getElementById('columnsTableBody');
        if (!tbody) return;

        // Apply combined filters (column name selection + boolean filters) before pagination
        const filteredColumns = this.getFilteredColumns();
        const totalColumns = filteredColumns.length;
        const totalPages = Math.max(1, Math.ceil(totalColumns / this.rowsPerPage));
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = Math.min(startIndex + this.rowsPerPage, totalColumns);
        const paginatedColumns = filteredColumns.slice(startIndex, endIndex);

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
                const start = totalColumns === 0 ? 0 : (this.currentPage - 1) * this.rowsPerPage + 1;
                const end = Math.min(start + this.rowsPerPage - 1, totalColumns);
                paginationInfo.innerHTML = `
                    Showing ${start} to ${end} of ${totalColumns} entries
                `;
            }
            this.updatePaginationButtons(totalColumns);
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

    private updatePaginationButtons = (totalEntries?: number): void => {
        const entries = totalEntries ?? this.getFilteredColumns().length;
        const totalPages = Math.max(1, Math.ceil(entries / this.rowsPerPage));
        
        // Update navigation buttons
        const prevPageBtn = document.querySelector('.prev-page');
        const nextPageBtn = document.querySelector('.next-page');
        
        if (prevPageBtn) prevPageBtn.classList.toggle('disabled', this.currentPage === 1);
        if (nextPageBtn) nextPageBtn.classList.toggle('disabled', this.currentPage >= totalPages);
    }

    private getColumnNameOptions = (): string[] => {
        return Array.from(new Set(this.allColumns.map(column => column.ColumnName || '')))
            .sort((a, b) => a.localeCompare(b));
    }

    private renderColumnNameCheckboxes = (): void => {
        const listContainer = document.getElementById('columnNameCheckboxList');
        const selectAllContainer = document.getElementById('columnNameSelectAllContainer');
        if (!listContainer || !selectAllContainer) return;

        const options = this.getColumnNameOptions()
            .filter(opt => opt.toLowerCase().includes(this.columnNameSearchTerm || ''))
            .sort((a, b) => this.columnNameSortDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a));

        // Select All UI
        selectAllContainer.innerHTML = '';
        const selectAllWrapper = document.createElement('div');
        selectAllWrapper.className = 'dropdown-item';
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'columnNameSelectAll';
        const visibleCount = options.length;
        const selectedVisibleCount = options.filter(o => this.selectedColumnNames.has(o)).length;
        if (selectedVisibleCount === 0) { selectAllCheckbox.checked = false; selectAllCheckbox.indeterminate = false; }
        else if (selectedVisibleCount === visibleCount) { selectAllCheckbox.checked = true; selectAllCheckbox.indeterminate = false; }
        else { selectAllCheckbox.checked = false; selectAllCheckbox.indeterminate = true; }

        const label = document.createElement('label');
        label.htmlFor = 'columnNameSelectAll';
        label.textContent = `Select All (${selectedVisibleCount}/${visibleCount})`;
        selectAllWrapper.appendChild(selectAllCheckbox);
        selectAllWrapper.appendChild(label);
        selectAllContainer.appendChild(selectAllWrapper);

        selectAllCheckbox.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            options.forEach(opt => {
                if (checked) this.selectedColumnNames.add(opt);
                else this.selectedColumnNames.delete(opt);
            });
            // keep dropdown open; just re-render
            this.renderColumnNameCheckboxes();
            this.updateTable();
        });

        // render items
        listContainer.innerHTML = '';
        if (options.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'dropdown-empty';
            empty.textContent = 'No matching columns';
            listContainer.appendChild(empty);
            this.updateColumnFilterCount();
            return;
        }

        options.forEach(opt => {
            const item = document.createElement('label');
            item.className = 'dropdown-item';
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.checked = this.selectedColumnNames.has(opt);
            chk.addEventListener('change', (e) => {
                const isChecked = (e.target as HTMLInputElement).checked;
                if (isChecked) this.selectedColumnNames.add(opt);
                else this.selectedColumnNames.delete(opt);
                // keep dropdown open
                this.renderColumnNameCheckboxes();
                this.updateTable();
            });
            const span = document.createElement('span');
            span.textContent = opt;
            item.appendChild(chk);
            item.appendChild(span);
            listContainer.appendChild(item);
        });

        this.updateColumnFilterCount();
    }

    private positionDropdown(trigger: HTMLElement, menu: HTMLElement): void {
        // Clear any previous inline positioning
        menu.style.left = '';
        menu.style.right = '';
        menu.style.top = '';
        menu.style.bottom = '';
        menu.style.maxWidth = '';

        const rect = trigger.getBoundingClientRect();
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const spaceRight = viewportWidth - rect.right;
        const spaceLeft = rect.left;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Vertical: prefer below unless not enough space
        if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
            menu.style.top = 'calc(100% + 6px)';
            menu.classList.remove('drop-up');
        } else {
            menu.style.bottom = 'calc(100% + 6px)';
            menu.classList.add('drop-up');
        }

        // Horizontal: align to right edge of header when possible, else left edge
        if (spaceRight >= menuWidth) {
            menu.style.right = '0';
            menu.style.left = 'auto';
        } else if (spaceLeft >= menuWidth) {
            menu.style.left = '0';
            menu.style.right = 'auto';
        } else {
            const clampWidth = Math.max(120, Math.min(menuWidth, Math.max(spaceRight, spaceLeft) - 16));
            menu.style.maxWidth = clampWidth + 'px';
            if (spaceRight >= spaceLeft) {
                menu.style.right = '0';
                menu.style.left = 'auto';
            } else {
                menu.style.left = '0';
                menu.style.right = 'auto';
            }
        }
    }

    private updateColumnFilterCount = (): void => {
        const countIndicator = document.getElementById('columnNameFilterCount');
        if (!countIndicator) return;

        const total = this.getColumnNameOptions().length;
        countIndicator.textContent = `${this.selectedColumnNames.size}/${total}`;
    }
    
    private getFilteredColumns = (): DataSetColumn[] => {
        // Start from all columns
        let filtered = this.allColumns.slice();

        // Apply ColumnName set filter
        if (this.selectedColumnNames) {
            // Treat an explicitly empty selection as "show none"
            if (this.selectedColumnNames.size === 0) {
                return [];
            }
            filtered = filtered.filter(c => this.selectedColumnNames!.has(c.ColumnName || ''));

        // Apply boolean filters
        if (this.redactedFilter === 'yes') filtered = filtered.filter(c => Boolean(c.Redact));
        else if (this.redactedFilter === 'no') filtered = filtered.filter(c => !Boolean(c.Redact));

        if (this.deidentifiedFilter === 'yes') filtered = filtered.filter(c => Boolean(c.Tokenise));
        else if (this.deidentifiedFilter === 'no') filtered = filtered.filter(c => !Boolean(c.Tokenise));

        // Apply sorting
        if (this.currentSortColumn) {
            filtered = filtered.sort((a: any, b: any) => {
                const aVal = (a[this.currentSortColumn as keyof DataSetColumn] ?? '') as any;
                const bVal = (b[this.currentSortColumn as keyof DataSetColumn] ?? '') as any;
                if (typeof aVal === 'string') return this.currentSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                if (typeof aVal === 'number') return this.currentSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                return 0;
            });
        }

        return filtered;
    }



    private createRequestModal = async (): Promise<void> => {
        const modal = document.getElementById('requestDatasetModal');
        if (!modal) return;

        try {
            console.log('Fetching projects...');
            const projectsResponse = await window.loomeApi.runApiRequest(API_GET_PROJECTS, {});

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