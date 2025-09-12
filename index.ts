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

interface FilterCriteria {
    type: string;
    value: string;
    valueTo?: string; // For date ranges
}


class CustomEmbed extends LibraryBase {
    public token: string = "";
    private allColumns: DataSetColumn[] = [];
    private currentSortColumn: string = "name";
    private currentSortDirection: "asc" | "desc" = "asc";
    private currentPage: number = 1;
    private rowsPerPage: number = 10;
    private activeFilters: Record<string, FilterCriteria> = {};
    private isFilterPanelVisible: boolean = false;

    constructor(element: HTMLElement, entityUrl: string, params: Customization.ParamValue[], settings: Customization.Setting[],
        errorCallback: (title: string, subTitle: string, message: string, element: HTMLElement) => void) {
        super(element, entityUrl, params, settings, errorCallback);
        this.loadResources();
    }

    public loadResources = async (): Promise<void> => {
        // await this.getAccessToken();
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
            await this.loadBootstrap();

            const DataSet: DataSetMetadata = await window.loomeApi.runApiRequest(6, {
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });

            const columnsResponse: ColumnsResponse = await window.loomeApi.runApiRequest(7, {
                DataSetID: this.getParamValue('DataSetID')?.value || '',
            });

            this.allColumns = columnsResponse.Results ?
                columnsResponse.Results.sort((a: DataSetColumn, b: DataSetColumn) => a.DisplayOrder - b.DisplayOrder) :
                [];

            // --- 1. Generate the main HTML structure ---
            const datasetHtml = this.generateMainLayout(DataSet);
            const styles = this.generateStyles();

            this.element.innerHTML = styles + datasetHtml;

            // --- 2. Set up event listeners and initial state ---
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

    private generateMainLayout(DataSet: DataSetMetadata): string {
        const filterButton = `<button id="filterBtn" class="btn btn-light ms-2">Filters</button>`;
        const requestDatasetBtn = `<button id="requestDatasetBtn" class="btn btn-light"><i class="bi bi-file-earmark-text"></i> Request Dataset</button>`;

        return `
            <div class="container-fluid mt-3">
                <div class="card mb-3">
                    <div class="card-header bg-primary text-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h2 class="h4 my-1">${DataSet.Name}</h2>
                            <div>
                                ${filterButton}
                                ${requestDatasetBtn}
                            </div>
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

                <div id="activeFiltersContainer" class="d-flex flex-wrap gap-2 mb-3"></div>

                <div id="filterPanel" class="card mb-3 filter-panel" style="display: none;">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Apply Filters</h5>
                        <div>
                            <button id="applyFiltersBtn" class="btn btn-sm btn-primary me-2">Apply</button>
                            <button id="clearFiltersBtn" class="btn btn-sm btn-secondary">Clear All</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <input id="filterSearchInput" class="form-control mb-3" type="search" placeholder="Search filters...">
                        <form id="filterForm">
                            ${this.generateFilterPanelHtml()}
                        </form>
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
                                    <th class="sortable" data-sort="IsFilter">Filter <i class="bi bi-sort"></i></th>
                                </tr>
                            </thead>
                            <tbody id="columnsTableBody">
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="card-footer">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                            <div class="entries-info">
                                Showing <span id="startEntry">0</span> to <span id="endEntry">0</span> of <span id="totalEntries">0</span> entries
                            </div>
                            <div class="d-flex align-items-center gap-3">
                                <select id="pageSize" class="form-select form-select-sm w-auto">
                                    <option value="10" selected>10 rows</option>
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

    private generateFilterPanelHtml(): string {
        const filterableColumns = this.allColumns.filter(col => col.IsFilter);
        let filterHtml = '';
        if (filterableColumns.length === 0) {
            return `<p class="text-muted">No filterable columns found.</p>`;
        }

        filterableColumns.forEach((col: DataSetColumn) => {
            let inputField = '';
            let labelText = col.LogicalColumnName || col.ColumnName;

            if (col.ColumnType.toLowerCase() === 'datetime') {
                inputField = `
                    <div class="d-flex gap-2">
                        <label for="filter-${col.ColumnName}-from" class="visually-hidden">${labelText} From</label>
                        <input type="datetime-local" class="form-control form-control-sm" id="filter-${col.ColumnName}-from" name="from">
                        <label for="filter-${col.ColumnName}-to" class="visually-hidden">${labelText} To</label>
                        <input type="datetime-local" class="form-control form-control-sm" id="filter-${col.ColumnName}-to" name="to">
                    </div>`;
            } else if (col.ColumnType.toLowerCase() === 'int') {
                inputField = `<input type="number" class="form-control form-control-sm" id="filter-${col.ColumnName}" name="value">`;
            } else {
                inputField = `<input type="text" class="form-control form-control-sm" id="filter-${col.ColumnName}" name="value">`;
            }

            filterHtml += `
                <div class="mb-3" data-column="${col.ColumnName}">
                    <label class="form-label">${labelText}</label>
                    ${inputField}
                </div>
            `;
        });
        return filterHtml;
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
                .filter-panel {
                    transition: all 0.3s ease-in-out;
                    max-height: 0;
                    overflow: hidden;
                    opacity: 0;
                }
                .filter-panel.visible {
                    max-height: 1000px; /* A large value to allow smooth transition */
                    opacity: 1;
                }
                .active-filter-pill {
                    background-color: #e2f4f1;
                    color: #0b684b;
                    border: 1px solid #c2e2dd;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.875rem;
                    display: inline-flex;
                    align-items: center;
                    cursor: default;
                }
                .active-filter-pill .close-btn {
                    background: none;
                    border: none;
                    color: #0b684b;
                    margin-left: 0.5rem;
                    font-size: 1rem;
                    line-height: 1;
                    cursor: pointer;
                    opacity: 0.7;
                }
                .active-filter-pill .close-btn:hover {
                    opacity: 1;
                }
            </style>
        `;
    }

    public setupEventListeners = (): void => {
        const filterBtn = document.getElementById('filterBtn');
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        const filterPanel = document.getElementById('filterPanel');
        const requestDatasetBtn = document.getElementById('requestDatasetBtn');
        const pageSize = document.getElementById('pageSize') as HTMLSelectElement;
        const mainTableHeaders = document.querySelectorAll('.table th.sortable');
        const paginationList = document.getElementById('paginationNumbers');

        // Toggle Filter Panel
        if (filterBtn && filterPanel) {
            filterBtn.addEventListener('click', () => {
                this.isFilterPanelVisible = !this.isFilterPanelVisible;
                filterPanel.classList.toggle('visible', this.isFilterPanelVisible);
                filterPanel.style.display = this.isFilterPanelVisible ? 'block' : 'none';
            });
        }
        
        // Apply Filters
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                const form = document.getElementById('filterForm') as HTMLFormElement;
                if (!form) return;
                
                this.activeFilters = {};
                this.allColumns.filter(c => c.IsFilter).forEach(col => {
                    const fromInput = document.getElementById(`filter-${col.ColumnName}-from`) as HTMLInputElement;
                    const toInput = document.getElementById(`filter-${col.ColumnName}-to`) as HTMLInputElement;
                    const valueInput = document.getElementById(`filter-${col.ColumnName}`) as HTMLInputElement;

                    if (fromInput && toInput && (fromInput.value || toInput.value)) {
                        this.activeFilters[col.ColumnName] = { type: 'datetime', value: fromInput.value, valueTo: toInput.value };
                    } else if (valueInput && valueInput.value) {
                        this.activeFilters[col.ColumnName] = { type: 'text', value: valueInput.value };
                    }
                });

                this.currentPage = 1;
                this.updateTable();
                this.renderActiveFilters();
                this.isFilterPanelVisible = false;
                if (filterPanel) filterPanel.style.display = 'none';
            });
        }

        // Clear All Filters
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                const form = document.getElementById('filterForm') as HTMLFormElement;
                if (form) form.reset();
                this.activeFilters = {};
                this.currentPage = 1;
                this.updateTable();
                this.renderActiveFilters();
            });
        }

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
                    this.currentPage = 1;
                    this.updateTable();
                }
            });
        });

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
                } else if (target.id === 'nextPage' && this.currentPage < Math.ceil(this.getFilteredAndSortedColumns().length / this.rowsPerPage)) {
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

    private getFilteredAndSortedColumns = (): DataSetColumn[] => {
        let filteredColumns = this.allColumns;
        const filterKeys = Object.keys(this.activeFilters);

        // Apply filters
        if (filterKeys.length > 0) {
            filteredColumns = filteredColumns.filter(column => {
                const filter = this.activeFilters[column.ColumnName];
                if (!filter) return true;

                if (filter.type === 'datetime') {
                    const rowDate = new Date(column.ExampleValue || '');
                    const fromDate = filter.value ? new Date(filter.value) : null;
                    const toDate = filter.valueTo ? new Date(filter.valueTo) : null;
                    const isAfterFrom = fromDate ? rowDate >= fromDate : true;
                    const isBeforeTo = toDate ? rowDate <= toDate : true;
                    return isAfterFrom && isBeforeTo;
                } else {
                    return (column.ExampleValue || '').toLowerCase().includes(filter.value.toLowerCase());
                }
            });
        }
        
        // Apply sort
        return filteredColumns.sort((a, b) => {
            const aValue = (a[this.currentSortColumn as keyof DataSetColumn] || '').toString().toLowerCase();
            const bValue = (b[this.currentSortColumn as keyof DataSetColumn] || '').toString().toLowerCase();
            
            if (aValue < bValue) return this.currentSortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    private updateTable = (): void => {
        const tbody = document.getElementById('columnsTableBody');
        if (!tbody) return;

        const filteredAndSorted = this.getFilteredAndSortedColumns();
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        const paginatedColumns = filteredAndSorted.slice(startIndex, endIndex);

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
                    <td>${column.IsFilter ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-light text-dark">No</span>'}</td>
                </tr>
            `;
        });
        tbody.innerHTML = columnsHtml;

        this.updatePaginationInfo(filteredAndSorted.length);
        this.updatePaginationNumbers(filteredAndSorted.length);
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

    private renderActiveFilters = (): void => {
        const container = document.getElementById('activeFiltersContainer');
        if (!container) return;

        container.innerHTML = '';
        Object.entries(this.activeFilters).forEach(([key, filter]) => {
            const logicalName = this.allColumns.find(c => c.ColumnName === key)?.LogicalColumnName || key;
            const value = filter.type === 'datetime' ? `${filter.value} to ${filter.valueTo}` : filter.value;
            
            const pill = document.createElement('span');
            pill.className = 'active-filter-pill';
            pill.innerHTML = `${logicalName}: <b>${value}</b> <button type="button" class="close-btn" data-key="${key}">x</button>`;
            
            pill.querySelector('.close-btn')?.addEventListener('click', (e) => {
                const targetKey = (e.target as HTMLElement).getAttribute('data-key');
                if (targetKey) {
                    delete this.activeFilters[targetKey];
                    this.currentPage = 1;
                    this.updateTable();
                    this.renderActiveFilters();
                }
            });
            container.appendChild(pill);
        });
    }

    private createRequestModal = (): void => {
        const modalElement = document.getElementById('requestDatasetModal');
        if (!modalElement || !(window as any).bootstrap?.Modal) {
            console.error('Bootstrap Modal is not available');
            return;
        }

        const modalBody = modalElement.querySelector('.modal-body');
        if (!modalBody) return;
        
        const modal = new ((window as any).bootstrap.Modal)(modalElement);
        
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

    private loadBootstrap(): Promise<void> {
        return new Promise((resolve, reject) => {
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