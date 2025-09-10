import { LibraryBase } from "./library-base";
import { Customization } from './customization';

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
    IsFilter: boolean;
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
            // Fetch the dataset metadata
            const DataSet: DataSetMetadata = await window.loomeApi.runApiRequest(6, {
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });
            
            // Fetch the dataset columns using API request 7
            const columnsResponse: ColumnsResponse = await window.loomeApi.runApiRequest(7, {
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });
            
            // Extract columns from the Results array and sort by DisplayOrder
            const dataSetColumns = columnsResponse.Results ? 
                columnsResponse.Results.sort((a: DataSetColumn, b: DataSetColumn) => a.DisplayOrder - b.DisplayOrder) : 
                [];
            
            // Now let's generate the HTML for the columns
            let columnsHtml = '';
            if (dataSetColumns && Array.isArray(dataSetColumns)) {
                dataSetColumns.forEach((column: DataSetColumn) => {
                    columnsHtml += `
                        <tr>
                            <td>${column.ColumnName || ''}</td>
                            <td><span class="badge bg-secondary">${column.ColumnType || ''}</span></td>
                            <td>${column.LogicalColumnName || ''}</td>
                            <td>${column.BusinessDescription || 'N/A'}</td>
                            <td><code>${column.ExampleValue || 'N/A'}</code></td>
                            <td>${column.Redact ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-light text-dark">No</span>'}</td>
                            <td>${column.Tokenise ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-light text-dark">No</span>'}</td>
                            <td>${column.IsFilter ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-light text-dark">No</span>'}</td>
                        </tr>
                    `;
                });
            }
            
            // --- 1. Generate the HTML structure ---
            const datasetHtml = `
                <div class="container-fluid mt-3">
                    <div class="card mb-3">
                        <div class="card-header bg-primary text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <h2 class="h4 my-1">${DataSet.Name}</h2>
                                <button id="requestDatasetBtn" class="btn btn-light">
                                    <i class="bi bi-file-earmark-text"></i> Request Dataset
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-md-4">
                                    <span class="badge bg-info text-dark">ID: ${DataSet.DataSetID}</span>
                                    <span class="badge bg-info text-dark">Owner: ${DataSet.Owner}</span>
                                    <span class="badge bg-info text-dark">Modified: ${new Date(DataSet.ModifiedDate).toLocaleDateString()}</span>
                                </div>
                                <div class="col-md-8">
                                    <p class="mb-0">${DataSet.Description}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Columns table -->
                    <div class="card mb-3">
                        <div class="card-header">
                            <h4 class="mb-0">Dataset Columns</h4>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover mb-0">
                                <thead class="table-dark">
                                    <tr>
                                        <th class="sortable" data-sort="name">Column Name <i class="bi bi-sort-down"></i></th>
                                        <th class="sortable" data-sort="type">Data Type <i class="bi bi-sort"></i></th>
                                        <th class="sortable" data-sort="logical">Logical Name <i class="bi bi-sort"></i></th>
                                        <th class="sortable" data-sort="description">Description <i class="bi bi-sort"></i></th>
                                        <th class="sortable" data-sort="example">Example <i class="bi bi-sort"></i></th>
                                        <th class="sortable" data-sort="redacted">Redacted <i class="bi bi-sort"></i></th>
                                        <th class="sortable" data-sort="tokenized">Tokenized <i class="bi bi-sort"></i></th>
                                        <th class="sortable" data-sort="filter">Filter <i class="bi bi-sort"></i></th>
                                    </tr>
                                </thead>
                                <tbody id="columnsTableBody">
                                    ${columnsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Pagination controls -->
                    <div class="card-footer">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="entries-info">
                                Showing <span id="startEntry">1</span> to <span id="endEntry">3</span> of <span id="totalEntries">0</span> entries
                            </div>
                            <div class="pagination-controls">
                                <select id="pageSize" class="form-select form-select-sm d-inline-block w-auto me-2">
                                    <option value="3" selected>3 rows</option>
                                    <option value="10">10 rows</option>
                                    <option value="25">25 rows</option>
                                    <option value="50">50 rows</option>
                                </select>
                                <nav aria-label="Table navigation">
                                    <ul class="pagination pagination-sm mb-0">
                                        <li class="page-item" id="prevPage">
                                            <a class="page-link" href="#" aria-label="Previous">
                                                <span aria-hidden="true">&laquo;</span>
                                            </a>
                                        </li>
                                        <li class="page-item" id="nextPage">
                                            <a class="page-link" href="#" aria-label="Next">
                                                <span aria-hidden="true">&raquo;</span>
                                            </a>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                    

                    
                    <div class="modal fade" id="requestDatasetModal" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Request Dataset</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body" id="requestDatasetModalBody"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const styles = `
                <style>
                    .sortable { cursor: pointer; }
                    .sortable i { font-size: 0.8rem; margin-left: 5px; opacity: 0.5; }
                    td code { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; display: inline-block; }
                    .card-header .btn {
                        margin-left: 15px;
                        font-weight: 500;
                    }
                    
                    .card-header .d-flex {
                        width: 100%;
                    }
                    
                    .card-header h2 {
                        margin: 0;
                        flex: 1;
                    }
                    
                    .card-header .btn {
                        white-space: nowrap;
                    }
                </style>
            `;
            
            this.element.innerHTML = styles + datasetHtml;
            
            
            setTimeout(() => {
                const requestDatasetModal = document.getElementById('requestDatasetModal');
                

                const requestDatasetBtn = document.getElementById('requestDatasetBtn');
                
                let currentSortColumn = "name";
                let currentSortDirection = "desc";
                
                let currentPage = 1;
                let rowsPerPage = 3;
                let filteredRows: HTMLTableRowElement[] = [];
                
                // Replace the existing sortTable function with this updated version:
                function sortTable(tableId: string, columnIndex: number, columnName: string): void {
                    const table = document.getElementById(tableId);
                    if (!table) return;
                    
                    const tbody = table.querySelector('tbody');
                    if (!tbody) return;
                    
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    
                    // Update sort direction and headers
                    if (currentSortColumn === columnName) {
                        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSortColumn = columnName;
                        currentSortDirection = 'asc';
                    }
                    
                    // Sort the rows
                    filteredRows = rows.sort((a, b) => {
                        const aValue = (a.cells[columnIndex].textContent || '').trim();
                        const bValue = (b.cells[columnIndex].textContent || '').trim();
                        return currentSortDirection === 'asc' 
                            ? aValue.localeCompare(bValue) 
                            : bValue.localeCompare(aValue);
                    });
                    
                    updateTable();
                }
                
                // Add these new functions:
                function updateTable(): void {
                    const tbody = document.getElementById('columnsTableBody');
                    if (!tbody) return;
                    
                    // Calculate pagination
                    const startIndex = (currentPage - 1) * rowsPerPage;
                    const endIndex = startIndex + rowsPerPage;
                    const paginatedRows = filteredRows.slice(startIndex, endIndex);
                    
                    // Update table content
                    tbody.innerHTML = '';
                    paginatedRows.forEach(row => tbody.appendChild(row.cloneNode(true)));
                    
                    // Update pagination info
                    updatePaginationInfo();
                }
                
                function updatePaginationInfo(): void {
                    const totalRows = filteredRows.length;
                    const startEntry = Math.min((currentPage - 1) * rowsPerPage + 1, totalRows);
                    const endEntry = Math.min(currentPage * rowsPerPage, totalRows);
                    
                    document.getElementById('startEntry')!.textContent = startEntry.toString();
                    document.getElementById('endEntry')!.textContent = endEntry.toString();
                    document.getElementById('totalEntries')!.textContent = totalRows.toString();
                    
                    // Update pagination buttons state
                    const prevPageBtn = document.getElementById('prevPage');
                    const nextPageBtn = document.getElementById('nextPage');
                    
                    if (prevPageBtn) {
                        prevPageBtn.classList.toggle('disabled', currentPage === 1);
                    }
                    if (nextPageBtn) {
                        nextPageBtn.classList.toggle('disabled', endEntry >= totalRows);
                    }
                }
                
                function CreateRequest() {
                    const modalBody = document.getElementById('requestDatasetModalBody');
                    
                    if (!modalBody || !requestDatasetModal) return;
                    
                    const formHtml = `
                        <form id="requestForm">
                            <div class="mb-3">
                                <label for="RequestName" class="form-label">Request Name</label>
                                <input id="RequestName" class="form-control" placeholder="Name for this request" required>
                            </div>
                            <div class="mb-3">
                                <label for="ProjectID" class="form-label">Assist Project</label>
                                <select id="ProjectID" class="form-select" required>
                                    <option value="">Select a Project</option>
                                    <option value="82">Project 1</option>
                                    <option value="84">Project 2</option>
                                    <option value="85">Project 3</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="ScheduleRefresh" class="form-label">Scheduled Refresh</label>
                                <select id="ScheduleRefresh" class="form-select">
                                    <option value="No Refresh">No Refresh</option>
                                    <option value="Daily">Daily</option>
                                    <option value="Weekly">Weekly</option>
                                    <option value="Monthly">Monthly</option>
                                </select>
                            </div>
                            <div class="d-flex justify-content-between">
                                <button type="submit" class="btn btn-primary">Submit</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            </div>
                        </form>
                    `;
                    
                    modalBody.innerHTML = formHtml;
                    
                    // Initialize Bootstrap modal
                    const modal = new (window as any).bootstrap.Modal(requestDatasetModal);
                    modal.show();
                    
                    const requestForm = document.getElementById('requestForm');
                    if (requestForm) {
                        requestForm.addEventListener('submit', function(e) {
                            e.preventDefault();
                            alert('Request submitted successfully!');
                            modal.hide();
                        });
                    }
                }
                

                
                if (requestDatasetBtn) {
                    requestDatasetBtn.addEventListener('click', CreateRequest);
                }
                

                
                const mainTableHeaders = document.querySelectorAll('.table th.sortable');
                mainTableHeaders.forEach((header, index) => {
                    header.addEventListener('click', function(this: HTMLElement) {
                        const sortType = this.getAttribute('data-sort');
                        if (sortType) {
                            sortTable('columnsTableBody', index, sortType);
                        }
                    });
                });
                
                // Initialize with default sort
                sortTable('columnsTableBody', 0, 'name');
                
                // Initialize pagination controls
                const pageSize = document.getElementById('pageSize') as HTMLSelectElement;
                const prevPageBtn = document.getElementById('prevPage');
                const nextPageBtn = document.getElementById('nextPage');
                
                if (pageSize) {
                    pageSize.addEventListener('change', (e) => {
                        rowsPerPage = parseInt((e.target as HTMLSelectElement).value);
                        currentPage = 1;
                        updateTable();
                    });
                }
                
                if (prevPageBtn) {
                    prevPageBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                            currentPage--;
                            updateTable();
                        }
                    });
                }
                
                if (nextPageBtn) {
                    nextPageBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const maxPages = Math.ceil(filteredRows.length / rowsPerPage);
                        if (currentPage < maxPages) {
                            currentPage++;
                            updateTable();
                        }
                    });
                }

                // Initialize the table with pagination
                filteredRows = Array.from(document.querySelectorAll('#columnsTableBody tr'));
                updateTable();
            }, 100);
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