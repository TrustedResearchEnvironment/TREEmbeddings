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
    public token: string = "";
    private allColumns: DataSetColumn[] = [];
    private currentSortColumn: string = "name";
    private currentSortDirection: "asc" | "desc" = "asc";
    private currentPage: number = 1;
    private rowsPerPage: number = 2;



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
    // Modal content population functions
    private ViewDictionary(): void {
        const modalBody = document.getElementById('viewDictionaryModalBody');
        if (!modalBody) return;
        modalBody.innerHTML = `
             <div>
            <!-- Filter Input -->
            <div class="row">
                <div class="input-group mb-3">
                    <input class="form-control" type="text" placeholder="Filter Dictionary">
                    <div class="input-group-append">
                        <button class="btn btn-outline-secondary" type="button">Clear</button>
                    </div>
                </div>
            </div>
            <hr>
            <!-- Table Section -->
            <div style="overflow-y: auto;">
                <h6>Columns</h6>
                <div class="table-responsive">
                    <table class="table table-condensed table-striped data-set-table">
                        <thead>
                            <tr>
                                <th>Column Name</th>
                                <th>Column Type</th>
                                <th>Logical Column Name</th>
                                <th>Business Description</th>
                                <th>Example Value</th>
                                <th>Redacted</th>
                                <th>De-identified</th>
                                <th>Can be Filtered</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Dynamic rows go here -->
                            <tr>
                                <td>Sample Column</td>
                                <td>text</td>
                                <td>Logical Name</td>
                                <td>Short description of the column</td>
                                <td>Example Value</td>
                                <td>False</td>
                                <td>True</td>
                                <td>False</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }

    private CreateRequest(): void {
        const modalBody = document.getElementById('requestDatasetModalBody');
        if (!modalBody) return;
        modalBody.innerHTML = `
                    <div class="col-md-12">
                        <form>
                            <!-- Request Name Field -->
                            <div class="form-group">
                                <label for="RequestName" class="control-label">Request Name</label>
                                <input id="RequestName" class="form-control" placeholder="Name for this request">
                            </div>
                            <!-- Assist Project Field -->
                            <div class="form-group" >
                                    <label for="ProjectID" class="control-label">Assist Project</label>
                                    <select id="ProjectID" class="form-select">
                                        <option value="-1">Select a Project</option>
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
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            </div>
                        </form>
                    </div>
        `;
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
            await this.loadBootstrap();
            
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
        }
    }

    private generateMainLayout(DataSet: DataSetMetadata): string {
        const requestDatasetBtn = `<button id="requestDatasetBtn" class="btn btn-light"><i class="bi bi-file-earmark-text"></i> Request Dataset</button>`;

        return `
            <div class="container-fluid mt-3">
                <div class="card mb-3">
                    <div class="card-header bg-primary text-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h2 class="h4 my-1">${DataSet.Name}</h2>
                            <div>
                                ${requestDatasetBtn}

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
                </div>

                
                <div class="card mb-3">
                    <div class="card-header">
                        <h4 class="mb-0">Dataset Columns</h4>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped table-hover mb-0">
                            <thead class="table-dark">
                                <tr>
                                    <th class="sortable" data-sort="ColumnName">Column Name <i class="bi bi-sort-down"></i></th>
                                    <th class="sortable" data-sort="ColumnType">Data Type <i class="bi bi-sort"></i></th>
                                    <th class="sortable" data-sort="LogicalColumnName">Logical Name <i class="bi bi-sort"></i></th>
                                    <th class="sortable" data-sort="BusinessDescription">Description <i class="bi bi-sort"></i></th>
                                    <th class="sortable" data-sort="ExampleValue">Example <i class="bi bi-sort"></i></th>
                                    <th class="sortable" data-sort="Redact">Redacted <i class="bi bi-sort"></i></th>
                                    <th class="sortable" data-sort="Tokenise">Tokenized <i class="bi bi-sort"></i></th>
                                </tr>
                            </thead>
                            <tbody id="columnsTableBody">
                            </tbody>
                        </table>

                    </div>
                    
                    <!-- Pagination controls -->
                    <div class="card-footer">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                            <div class="entries-info">
                                Showing <span id="startEntry">1</span> to <span id="endEntry">3</span> of <span id="totalEntries">0</span> entries
                            </div>
                            <div class="d-flex align-items-center gap-3">
                                <select id="pageSize" class="form-select form-select-sm w-auto">
                                    <option value="2" selected>2 rows</option>
                                    <option value="10">10 rows</option>
                                    <option value="25">25 rows</option>
                                    <option value="50">50 rows</option>
                                </select>
                                <nav aria-label="Table navigation" class="d-flex justify-content-center flex-grow-1">
                                    <ul class="pagination pagination-sm mb-0" id="paginationNumbers">
                                        <li class="page-item" id="prevPage">
                                            <a class="page-link" href="#" aria-label="Previous">
                                                <span aria-hidden="true">&laquo;</span>
                                            </a>
                                        </li>
                                        <!-- Page numbers will be inserted here -->
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
                </div>
            </div>
        `;
    }

    
    private generateStyles(): string {
        return `
            <style>
                .sortable { cursor: pointer; }
                .sortable i { font-size: 0.8rem; margin-left: 5px; opacity: 0.5; }
                td code { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; display: inline-block; }
                .card-header .btn {
                    margin-left: 15px;
                    font-weight: 500;
                }

                

                const requestDatasetBtn = document.getElementById('requestDatasetBtn');
                
                let currentSortColumn = "name";
                let currentSortDirection = "desc";
                
                let currentPage = 1;
                let rowsPerPage = 2;
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
                    updatePaginationNumbers(); // Add this line
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

    public setupEventListeners = (): void => {
        const requestDatasetBtn = document.getElementById('requestDatasetBtn');
        const pageSize = document.getElementById('pageSize') as HTMLSelectElement;
        const mainTableHeaders = document.querySelectorAll('.table th.sortable');
        const paginationList = document.getElementById('paginationNumbers');


        



        // Sort Table
        mainTableHeaders.forEach((header, index) => {
            header.addEventListener('click', () => {
                const sortType = header.getAttribute('data-sort');
                if (sortType) {
                    if (this.currentSortColumn === sortType) {
                        this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.currentSortColumn = sortType;
                        this.currentSortDirection = 'asc';

                    }
                }
                

        // Pagination controls
        if (pageSize) {
            pageSize.addEventListener('change', (e) => {
                this.rowsPerPage = parseInt((e.target as HTMLSelectElement).value);
                this.currentPage = 1;
                this.updateTable();
            });
        }
        if (paginationList) {
            paginationList.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (target.id === 'prevPage' && this.currentPage > 1) {
                    this.currentPage--;
                    this.updateTable();
                } else if (target.id === 'nextPage' && this.currentPage < Math.ceil(this.allColumns.length / this.rowsPerPage)) {
                    this.currentPage++;
                    this.updateTable();
                }
            });
        }
        
        // Request Dataset Modal
        if (requestDatasetBtn) {
            requestDatasetBtn.addEventListener('click', () => this.createRequestModal());
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
                    <td><span class="badge bg-secondary">${column.ColumnType || ''}</span></td>
                    <td>${column.LogicalColumnName || ''}</td>
                    <td>${column.BusinessDescription || 'N/A'}</td>
                    <td><code>${column.ExampleValue || 'N/A'}</code></td>
                    <td>${column.Redact ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-light text-dark">No</span>'}</td>
                    <td>${column.Tokenise ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-light text-dark">No</span>'}</td>
                </tr>
            `;
        });
        tbody.innerHTML = columnsHtml;

        this.updatePaginationInfo(this.allColumns.length);
        this.updatePaginationNumbers(this.allColumns.length);
        this.updateSortIcons();
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

    private updatePaginationInfo = (totalRows: number): void => {
        const startEntry = Math.min((this.currentPage - 1) * this.rowsPerPage + 1, totalRows);
        const endEntry = Math.min(this.currentPage * this.rowsPerPage, totalRows);

        document.getElementById('startEntry')!.textContent = startEntry.toString();
        document.getElementById('endEntry')!.textContent = endEntry.toString();
        document.getElementById('totalEntries')!.textContent = totalRows.toString();
        
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        
        if (prevPageBtn) {
            prevPageBtn.classList.toggle('disabled', this.currentPage === 1);
        }
        if (nextPageBtn) {
            nextPageBtn.classList.toggle('disabled', this.currentPage * this.rowsPerPage >= totalRows);
        }
    }

    private updatePaginationNumbers = (totalRows: number): void => {
        const paginationList = document.getElementById('paginationNumbers');
        if (!paginationList) return;

        const totalPages = Math.ceil(totalRows / this.rowsPerPage);
        const prevButton = paginationList.querySelector('#prevPage');
        const nextButton = paginationList.querySelector('#nextPage');

        const existingNumbers = paginationList.querySelectorAll('.page-number');
        existingNumbers.forEach(num => num.remove());

        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item page-number ${this.currentPage === i ? 'active' : ''}`;
            
            const pageLink = document.createElement('a');
            pageLink.className = 'page-link';
            pageLink.href = '#';
            pageLink.textContent = i.toString();
            
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentPage = i;
                this.updateTable();
            });

            pageItem.appendChild(pageLink);
            nextButton?.parentNode?.insertBefore(pageItem, nextButton);
        }

        if (prevButton) {
            prevButton.classList.toggle('disabled', this.currentPage === 1);
        }
        if (nextButton) {
            nextButton.classList.toggle('disabled', this.currentPage >= totalPages);
        }
    }



    private createRequestModal = (): void => {
        const modalElement = document.getElementById('requestDatasetModal');
        if (!modalElement || !(window as any).bootstrap?.Modal) {
            console.error('Bootstrap Modal is not available');
            return;
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

    private loadBootstrap(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if ((window as any).bootstrap?.Modal) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js';
            script.integrity = 'sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p';
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Bootstrap'));
            document.head.appendChild(script);
        });
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