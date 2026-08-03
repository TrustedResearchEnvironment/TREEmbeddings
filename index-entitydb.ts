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
    Deidentify: boolean;
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

interface DateTimeFilterField {
    DataSetColumnID: number;
    ColumnName: string;
}

interface DateTimeFilter {
    id: number;
    field: string;
    from: string;
    to: string;
}

class RangeDatePicker {
    private months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    private minYear = 1900;
    private currentYear = new Date().getFullYear();
    
    private startDate: Date | null = null;
    private endDate: Date | null = null;
    
    // Stable state for revert functionality
    private confirmedStartDate: Date | null = null;
    private confirmedEndDate: Date | null = null;
    // Temporary state during selection process
    private tempStartDate: Date | null = null;
    private tempEndDate: Date | null = null;

    private dropdown: HTMLElement;
    private input: HTMLInputElement;
    private onApply: (start: Date | null, end: Date | null) => void;
    private fromMonthSel!: HTMLSelectElement;
    private fromYearInp!: HTMLInputElement;
    private toMonthSel!: HTMLSelectElement;
    private toYearInp!: HTMLInputElement;
    private fromGrid!: HTMLElement;
    private toGrid!: HTMLElement;
    private preview!: HTMLElement;
    private cancelBtn!: HTMLButtonElement;

    constructor(container: HTMLElement, initialFrom: string, initialTo: string, onApply: (start: Date | null, end: Date | null) => void) {
        this.input = container.querySelector('.range-picker-input') as HTMLInputElement;
        this.onApply = onApply;

        // Create Dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'range-picker-dropdown';
        this.dropdown.innerHTML = `
            <div class="range-picker-header">
                <span class="range-picker-preview">Select dates...</span>
                <div class="range-picker-actions">
                    <button type="button" class="range-picker-btn range-picker-btn-cancel">Cancel</button>
                </div>
            </div>
            <div class="range-picker-calendars">
                <div class="range-picker-calendar-box">
                    <div class="range-picker-calendar-title">From</div>
                    <div class="range-picker-selects">
                        <select class="range-picker-select from-month"></select>
                        <div class="range-picker-year-container">
                            <input type="number" class="range-picker-year-input from-year" min="${this.minYear}" max="${this.currentYear}" step="1" aria-label="Year">
                            <span class="range-picker-validation"></span>
                        </div>
                    </div>
                    <div class="range-picker-weekdays">
                        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                    </div>
                    <div class="range-picker-days from-grid"></div>
                </div>
                <div class="range-picker-calendar-box">
                    <div class="range-picker-calendar-title">To</div>
                    <div class="range-picker-selects">
                        <select class="range-picker-select to-month"></select>
                        <div class="range-picker-year-container">
                            <input type="number" class="range-picker-year-input to-year" min="${this.minYear}" max="${this.currentYear}" step="1" aria-label="Year">
                            <span class="range-picker-validation"></span>
                        </div>
                    </div>
                    <div class="range-picker-weekdays">
                        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                    </div>
                    <div class="range-picker-days to-grid"></div>
                </div>
            </div>
        `;
        document.body.appendChild(this.dropdown);

        // Bind Elements
        this.fromMonthSel = this.dropdown.querySelector('.from-month') as HTMLSelectElement;
        this.fromYearInp = this.dropdown.querySelector('.from-year') as HTMLInputElement;
        this.toMonthSel = this.dropdown.querySelector('.to-month') as HTMLSelectElement;
        this.toYearInp = this.dropdown.querySelector('.to-year') as HTMLInputElement;
        this.fromGrid = this.dropdown.querySelector('.from-grid') as HTMLElement;
        this.toGrid = this.dropdown.querySelector('.to-grid') as HTMLElement;
        this.preview = this.dropdown.querySelector('.range-picker-preview') as HTMLElement;
        this.cancelBtn = this.dropdown.querySelector('.range-picker-btn-cancel') as HTMLButtonElement;

        this.init(initialFrom, initialTo);
    }

    private init(isoFrom: string, isoTo: string) {
        this.months.forEach((m, i) => {
            this.fromMonthSel.add(new Option(m, i.toString()));
            this.toMonthSel.add(new Option(m, i.toString()));
        });

        if (isoFrom) {
            this.startDate = new Date(isoFrom);
            if (isNaN(this.startDate.getTime())) this.startDate = null;
        }
        if (isoTo) {
            this.endDate = new Date(isoTo);
            if (isNaN(this.endDate.getTime())) this.endDate = null;
        }

        this.confirmedStartDate = this.startDate;
        this.confirmedEndDate = this.endDate;

        const now = new Date();
        const displayStart = this.startDate || now;
        const displayEnd = this.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 1);

        this.fromMonthSel.value = displayStart.getMonth().toString();
        this.fromYearInp.value = displayStart.getFullYear().toString();
        this.toMonthSel.value = displayEnd.getMonth().toString();
        this.toYearInp.value = displayEnd.getFullYear().toString();

        this.input.value = '';
        if (this.startDate && this.endDate) {
            this.input.value = `${this.formatDate(this.startDate)} - ${this.formatDate(this.endDate)}`;
        }

        this.bindEvents();
        this.updateView();
    }

    private validateAndClampYear(input: HTMLInputElement): number {
        let val = parseInt(input.value);
        let clamped = false;
        const valSpan = input.nextElementSibling as HTMLElement;

        if (isNaN(val)) {
            val = this.currentYear;
            clamped = true;
        } else if (val < this.minYear) {
            val = this.minYear;
            clamped = true;
        } else if (val > this.currentYear) {
            val = this.currentYear;
            clamped = true;
        }

        if (clamped) {
            input.value = val.toString();
            valSpan.textContent = `Clamped to ${val}`;
            valSpan.classList.add('show');
            setTimeout(() => valSpan.classList.remove('show'), 2000);
        }
        return val;
    }

    private bindEvents() {
        this.input.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        this.cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelSelection();
        });

        [this.fromMonthSel, this.toMonthSel].forEach(sel => {
            sel.addEventListener('change', (e) => {
                e.stopPropagation();
                this.updateView(sel === this.fromMonthSel ? 'from' : 'to');
            });
        });

        [this.fromYearInp, this.toYearInp].forEach(inp => {
            const triggerUpdate = (e: Event) => {
                e.stopPropagation();
                this.validateAndClampYear(inp);
                this.updateView(inp === this.fromYearInp ? 'from' : 'to');
            };

            inp.addEventListener('blur', triggerUpdate);
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    triggerUpdate(e);
                    inp.blur();
                }
            });
        });

        this.dropdown.addEventListener('click', (e) => e.stopPropagation());

        document.addEventListener('click', (e) => {
            if (e.target !== this.input && !this.dropdown.contains(e.target as Node)) {
                if (this.dropdown.classList.contains('show')) {
                    this.hideDropdown();
                }
            }
        });

        window.addEventListener('scroll', () => this.reposition(), { passive: true });
        window.addEventListener('resize', () => this.reposition());
    }

    private toggleDropdown() {
        if (this.dropdown.classList.contains('show')) {
            this.hideDropdown();
        } else {
            this.showDropdown();
        }
    }

    private showDropdown() {
        document.querySelectorAll('.range-picker-dropdown').forEach(d => d.classList.remove('show'));
        this.tempStartDate = this.confirmedStartDate;
        this.tempEndDate = this.confirmedEndDate;
        this.startDate = this.confirmedStartDate;
        this.endDate = this.confirmedEndDate;
        this.dropdown.classList.add('show');
        this.reposition();
        this.updateView();
    }

    private hideDropdown() {
        if (this.tempStartDate && !this.tempEndDate) {
            this.startDate = this.confirmedStartDate;
            this.endDate = this.confirmedEndDate;
        }
        this.dropdown.classList.remove('show');
        this.updateView();
    }

    private cancelSelection() {
        this.startDate = this.confirmedStartDate;
        this.endDate = this.confirmedEndDate;
        this.tempStartDate = null;
        this.tempEndDate = null;
        this.hideDropdown();
    }

    private reposition() {
        if (!this.dropdown.classList.contains('show')) return;
        const rect = this.input.getBoundingClientRect();
        const dropdownHeight = this.dropdown.offsetHeight || 320;
        const spaceBelow = window.innerHeight - rect.bottom;
        const shouldDropUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
        
        if (shouldDropUp) {
            this.dropdown.classList.add('drop-up');
            this.dropdown.style.top = 'auto';
            this.dropdown.style.bottom = `${window.innerHeight - rect.top}px`;
        } else {
            this.dropdown.classList.remove('drop-up');
            this.dropdown.style.bottom = 'auto';
            this.dropdown.style.top = `${rect.bottom + 5}px`;
        }
        this.dropdown.style.left = `${rect.left}px`;

        const dropdownWidth = this.dropdown.offsetWidth || 580;
        if (rect.left + dropdownWidth > window.innerWidth) {
            this.dropdown.style.left = `${window.innerWidth - dropdownWidth - 20}px`;
        }
    }

    private formatDate(date: Date): string {
        return `${date.getDate()} ${this.months[date.getMonth()]} ${date.getFullYear()}`;
    }

    private toLocalISO(date: Date): string {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
    }

    private handleDayClick(date: Date) {
        if (!this.tempStartDate || (this.tempStartDate && this.tempEndDate)) {
            this.startDate = date;
            this.endDate = null;
            this.tempStartDate = date;
            this.tempEndDate = null;
            this.updateView();
        } else {
            if (date < this.tempStartDate) {
                this.startDate = date;
                this.endDate = null;
                this.tempStartDate = date;
                this.tempEndDate = null;
                this.updateView();
            } else {
                this.endDate = date;
                this.tempEndDate = date;
                this.updateView();
                this.confirmedStartDate = this.startDate;
                this.confirmedEndDate = this.endDate;
                this.input.value = `${this.formatDate(this.startDate!)} - ${this.formatDate(this.endDate)}`;
                this.onApply(this.startDate, this.endDate);
                this.dropdown.classList.remove('show');
            }
        }
    }

    private renderGrid(grid: HTMLElement, month: number, year: number, isToCalendar: boolean) {
        grid.innerHTML = '';
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const now = new Date();
        
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'range-picker-day empty';
            grid.appendChild(empty);
        }

        const startISO = this.startDate ? this.toLocalISO(this.startDate) : null;
        const endISO = this.endDate ? this.toLocalISO(this.endDate) : null;
        const tempStartISO = this.tempStartDate ? this.toLocalISO(this.tempStartDate) : null;

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const cell = document.createElement('div');
            cell.className = 'range-picker-day';
            cell.textContent = d.toString();
            const cellISO = this.toLocalISO(date);

            const isFuture = year === now.getFullYear() && month === now.getMonth() && d > now.getDate();
            const shouldDisable = (tempStartISO && !this.tempEndDate && cellISO < tempStartISO) || isFuture;

            if (shouldDisable) {
                cell.classList.add('disabled');
            } else {
                if (startISO && cellISO === startISO) cell.classList.add('selected-edge');
                if (endISO && cellISO === endISO) cell.classList.add('selected-edge');
                if (startISO && endISO && cellISO > startISO && cellISO < endISO) cell.classList.add('in-range');
                cell.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleDayClick(new Date(year, month, d));
                });
            }
            grid.appendChild(cell);
        }
    }

    private adjustLeapYear(date: Date | null, newYear: number): Date | null {
        if (!date) return null;
        const m = date.getMonth();
        let d = date.getDate();
        if (m === 1 && d === 29) {
            const isLeap = (newYear % 4 === 0 && newYear % 100 !== 0) || (newYear % 400 === 0);
            if (!isLeap) d = 28;
        }
        return new Date(newYear, m, d);
    }

    private updateView(trigger?: 'from' | 'to') {
        let fm = parseInt(this.fromMonthSel.value);
        let fy = parseInt(this.fromYearInp.value);
        let tm = parseInt(this.toMonthSel.value);
        let ty = parseInt(this.toYearInp.value);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Restrict navigation: Future months
        [this.fromMonthSel, this.toMonthSel].forEach((sel, idx) => {
            const year = idx === 0 ? fy : ty;
            Array.from(sel.options).forEach(opt => {
                const m = parseInt(opt.value);
                opt.disabled = year === currentYear && m > currentMonth;
            });
            if (year === currentYear && parseInt(sel.value) > currentMonth) {
                sel.value = currentMonth.toString();
                if (idx === 0) fm = currentMonth; else tm = currentMonth;
            }
        });

        // Leap Year adjust
        if (trigger === 'from' && this.startDate) this.startDate = this.adjustLeapYear(this.startDate, fy);
        if (trigger === 'to' && this.endDate) this.endDate = this.adjustLeapYear(this.endDate, ty);

        // Bounds Synchronization
        const fromVal = fy * 12 + fm;
        const toVal = ty * 12 + tm;

        if (fromVal > toVal) {
            if (trigger === 'from') {
                this.toYearInp.value = this.fromYearInp.value;
                this.toMonthSel.value = this.fromMonthSel.value;
                tm = fm; ty = fy;
            } else {
                this.fromYearInp.value = this.toYearInp.value;
                this.fromMonthSel.value = this.toMonthSel.value;
                fm = tm; fy = ty;
            }
        }

        this.renderGrid(this.fromGrid, fm, fy, false);
        this.renderGrid(this.toGrid, tm, ty, true);

        if (this.startDate && this.endDate) {
            this.preview.textContent = `${this.formatDate(this.startDate)} — ${this.formatDate(this.endDate)}`;
        } else if (this.startDate) {
            this.preview.textContent = `${this.formatDate(this.startDate)} — Select end date...`;
        } else {
            this.preview.textContent = 'Select dates...';
        }
    }

    public destroy() {
        if (this.dropdown?.parentNode) this.dropdown.parentNode.removeChild(this.dropdown);
    }
}

const API_GET_DATASET_METADATA = 'GetDataSetID';
const API_GET_DATASET_COLUMNS = 'GetDatasetIDColumns';
const API_SUBMIT_DATASET_REQUEST = 'RequestDataSet';
const API_GET_PROJECTS = 'GetAssistProjectsFilteredByUpn';
const API_GET_DATETIME_FIELDS = 'GetDataSetDateTimeFields';

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
    private _listenerController: AbortController | null = null;
    private datetimeFields: DateTimeFilterField[] = [];
    private dateTimeFilters: DateTimeFilter[] = [];
    private rangePickers: Map<number, RangeDatePicker> = new Map();
    private _filterIdCounter: number = 0;


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
            // Abort any stale document/window listeners from a previous session
            if (this._listenerController) this._listenerController.abort();
            this._listenerController = new AbortController();

            // Clean up any orphaned dropdown menu left in document.body from a previous session
            const orphanedMenu = document.body.querySelector('#columnNameDropdownMenu');
            if (orphanedMenu) orphanedMenu.remove();

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

            this.setupEventListeners(this._listenerController.signal);
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
                                    <input id="RequestName" class="form-input" placeholder="Name for this request" required maxlength="100">
                                    <span class="char-counter" id="RequestNameCounter">0/100</span>
                                </div>
                                <div class="form-group">
                                    <label for="RequestPurpose">Purpose</label>
                                    <textarea id="RequestPurpose" class="form-input" placeholder="Purpose for this request" required maxlength="500" rows="3"></textarea>
                                    <span class="char-counter" id="RequestPurposeCounter">0/500</span>
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
                                <div class="form-group">
                                    <label>Date/Time Filters</label>
                                    <div id="dateTimeFiltersContainer"></div>
                                    <button type="button" id="addDateTimeFilterBtn" class="add-filter-btn">
                                        <span class="material-icons" style="font-size:16px;vertical-align:middle">add</span>
                                        Add Filter
                                    </button>
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
                                                <div class="popover-option" data-value="all">All Data</div>
                                            </div>
                                        </div>
                                    </th>
                                    <th data-sort="Deidentify" class="header-filter-cell">
                                        <div class="header-filter">
                                            <span class="header-text">Deidentified</span>
                                            <button type="button" id="deidentifiedToggle" class="filter-icon" aria-haspopup="true" aria-expanded="false" title="Filter Deidentified">
                                                <span class="material-icons">filter_list</span>
                                            </button>
                                            <div class="popover" id="deidentifiedPopover">
                                                <div class="popover-option" data-value="yes">Yes</div>
                                                <div class="popover-option" data-value="no">No</div>
                                                <div class="popover-option" data-value="all">All Data</div>
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
                    min-height: 500px;
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
                    left: 30%;
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
                .cell-text-wrap {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: pre-wrap;
                    word-break: break-word;
                    line-height: 1.4;
                    cursor: default;
                    position: relative;
                }
                .cell-text-wrap:hover::after {
                    content: attr(title);
                    position: absolute;
                    left: 0;
                    top: 100%;
                    z-index: 9999;
                    background: #fff;
                    border: 1px solid #d0d7e0;
                    border-radius: 6px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                    padding: 8px 12px;
                    min-width: 200px;
                    max-width: 400px;
                    white-space: pre-wrap;
                    word-break: break-word;
                    font-size: 0.875rem;
                    line-height: 1.5;
                    color: #1f2a37;
                    pointer-events: none;
                }
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
                    padding: 16px 20px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 1.15rem;
                    color: #2c3e50;
                    font-weight: 600;
                }

                .modal-close {
                    font-size: 1.25rem;
                    color: #666;
                    cursor: pointer;
                    padding: 4px;
                    line-height: 1;
                }

                .modal-close:hover {
                    color: #333;
                }

                .modal-body {
                    padding: 16px 20px;
                }

                .request-form {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .form-group label {
                    font-weight: 500;
                    color: #2c3e50;
                    font-size: 0.9rem;
                }

                .form-input, .form-select {
                    padding: 6px 10px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    font-size: 0.9rem;
                }

                .form-input:focus, .form-select:focus {
                    border-color: #4EC4BC;
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(78,196,188,0.2);
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 8px;
                }

                .button {
                    padding: 6px 14px;
                    border-radius: 4px;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                    font-size: 0.9rem;
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

                .char-counter {
                    font-size: 0.7rem;
                    text-align: right;
                    display: none;
                    margin-top: 2px;
                }

                .char-counter.warning {
                    display: block;
                    color: #d32f2f;
                    font-weight: 600;
                }

                th.column-name-header-cell {
                    position: relative;
                    overflow: visible !important;
                }

                .dropdown-bridge {
                    position: absolute;
                    bottom: 0;         
                    left: 0;           
                    width: 0;         
                    height: 0;
                    overflow: visible; 
                }

                #columnNameDropdown {
                    position: absolute;
                    top: 4px;          
                    left: 0;

                    min-width: 250px;  
                    width: max-content; 
                    
                    background: #ffffff;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    z-index: 99999;     
                }

                .cell-text-wrap {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;  
                    -webkit-box-orient: vertical;
                    overflow: hidden;     
                    text-overflow: ellipsis; 
                    white-space: pre-wrap;
                    word-break: break-word; 
                    line-height: 1.4;
                    cursor: default;
                    position: relative;
                }
                .cell-text-wrap:hover::after {
                    content: attr(title);
                    position: absolute;
                    left: 0;
                    top: 100%;
                    z-index: 9999;
                    background: #fff;
                    border: 1px solid #d0d7e0;
                    border-radius: 6px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                    padding: 8px 12px;
                    min-width: 200px;
                    max-width: 400px;
                    white-space: pre-wrap;
                    word-break: break-word;
                    font-size: 0.875rem;
                    line-height: 1.5;
                    color: #1f2a37;
                    pointer-events: none;
                }
                .filter-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .filter-row-fields {
                    display: flex;
                    flex: 1;
                    gap: 8px;
                    flex-wrap: nowrap;
                }
                .filter-row-fields .form-input {
                    flex: 1;
                    min-width: 120px;
                }
                .remove-filter-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #d32f2f;
                    display: flex;
                    align-items: center;
                    padding: 4px;
                    border-radius: 4px;
                }
                .remove-filter-btn:hover { background: #fdecea; }
                .add-filter-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 8px;
                    padding: 6px 14px;
                    background: #f3f6f7;
                    border: 1px dashed #4EC4BC;
                    border-radius: 4px;
                    color: #4EC4BC;
                    font-size: 0.875rem;
                    cursor: pointer;
                }
                .add-filter-btn:hover { background: #e6f7f6; }
                .filter-empty-hint {
                    font-size: 0.8rem;
                    color: #9e9e9e;
                    margin: 4px 0;
                }

                /* Range Date Picker Styles */
                .range-picker-row-container {
                    position: relative;
                    flex: 1;
                    min-width: 280px;
                }

                .range-picker-input {
                    width: 100%;
                    padding: 8px 12px;
                    font-size: 0.9rem;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    outline: none;
                    box-sizing: border-box;
                    background: #fff;
                    cursor: pointer;
                }

                .range-picker-dropdown {
                    position: fixed;
                    z-index: 10000;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    border: 1px solid #eee;
                    padding: 12px 16px;
                    width: 580px;
                    display: none;
                }

                .range-picker-dropdown.show {
                    display: block;
                }

                .range-picker-dropdown.drop-up {
                    margin-bottom: 8px;
                }

                .range-picker-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f0f0f0;
                    padding-bottom: 8px;
                    margin-bottom: 8px;
                }

                .range-picker-preview {
                    font-weight: 500;
                    color: #333;
                    font-size: 0.85rem;
                }

                .range-picker-actions {
                    display: flex;
                    gap: 6px;
                }

                .range-picker-btn {
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                }

                .range-picker-btn-cancel {
                    background: transparent;
                    color: #666;
                }

                .range-picker-calendars {
                    display: flex;
                    gap: 16px;
                }

                .range-picker-calendar-box {
                    flex: 1;
                }

                .range-picker-calendar-title {
                    font-weight: 600;
                    font-size: 0.75rem;
                    margin-bottom: 6px;
                    color: #666;
                    text-transform: uppercase;
                }

                .range-picker-selects {
                    display: flex;
                    gap: 4px;
                    margin-bottom: 8px;
                }

                .range-picker-select {
                    flex: 1;
                    padding: 2px 4px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 0.75rem;
                }

                .range-picker-weekdays, .range-picker-days {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    text-align: center;
                }

                .range-picker-weekdays {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #999;
                    margin-bottom: 2px;
                }

                .range-picker-day {
                    padding: 4px 0;
                    font-size: 0.8rem;
                    cursor: pointer;
                    border-radius: 4px;
                    color: #333;
                }

                .range-picker-day:hover:not(.empty) {
                    background-color: #f3f4f6;
                }

                .range-picker-day.selected-edge {
                    background-color: #4f46e5 !important;
                    color: white !important;
                }

                .range-picker-day.in-range {
                    background-color: #eff6ff;
                    border-radius: 0;
                }

                .range-picker-day.disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                    pointer-events: none;
                }

                .range-picker-days {
                    row-gap: 1px;
                }

                .range-picker-day.empty {
                    cursor: default;
                }

                .range-picker-year-container {
                    position: relative;
                    flex: 1;
                }

                .range-picker-year-input {
                    width: 100%;
                    padding: 2px 4px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    box-sizing: border-box;
                    -moz-appearance: textfield;
                }

                .range-picker-year-input::-webkit-outer-spin-button,
                .range-picker-year-input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }

                .range-picker-validation {
                    position: absolute;
                    bottom: 100%;
                    left: 0;
                    background: #333;
                    color: #fff;
                    font-size: 0.65rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                    z-index: 10;
                    margin-bottom: 4px;
                }

                .range-picker-validation.show {
                    opacity: 1;
                }
            </style>
        `;
    }

    public setupEventListeners = (signal?: AbortSignal): void => {
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

            // Character counter logic
            const setupCharCounter = (inputId: string, counterId: string, maxLen: number) => {
                const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
                const counter = document.getElementById(counterId) as HTMLElement | null;
                if (input && counter) {
                    const update = () => {
                        const len = input.value.length;
                        counter.textContent = `${len}/${maxLen}`;
                        counter.classList.toggle('warning', len >= maxLen * 0.8);
                    };
                    input.addEventListener('input', update);
                    update();
                }
            };
            setupCharCounter('RequestName', 'RequestNameCounter', 100);
            setupCharCounter('RequestPurpose', 'RequestPurposeCounter', 500);

            // Add DateTime Filter listeners
            const addFilterBtn = document.getElementById('addDateTimeFilterBtn') as HTMLButtonElement | null;
            if (addFilterBtn) {
                addFilterBtn.addEventListener('click', () => {
                    this.dateTimeFilters.push({
                        id: ++this._filterIdCounter,
                        field: '', // Start with empty field to trigger "-- Select Field --" default
                        from: '',
                        to: ''
                    });
                    this.renderDateTimeFilters();
                });
            }

            const filtersContainer = document.getElementById('dateTimeFiltersContainer');
            if (filtersContainer) {
                filtersContainer.addEventListener('click', (e) => {
                    const btn = (e.target as HTMLElement).closest('.remove-filter-btn') as HTMLElement | null;
                    if (btn) {
                        const id = parseInt(btn.dataset.filterId ?? '');
                        this.dateTimeFilters = this.dateTimeFilters.filter(f => f.id !== id);
                        this.renderDateTimeFilters();
                    }
                });
                filtersContainer.addEventListener('change', (e) => {
                    const el = e.target as HTMLElement;
                    const id = parseInt((el as any).dataset.filterId ?? '');
                    const prop = (el as any).dataset.prop as keyof DateTimeFilter | undefined;
                    const value = (el as HTMLInputElement | HTMLSelectElement).value;
                    if (!isNaN(id) && prop) {
                        const filter = this.dateTimeFilters.find(f => f.id === id);
                        if (filter) {
                            (filter as any)[prop] = value;
                            if (prop === 'field') {
                                this.renderDateTimeFilters();
                            }
                        }
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

                        // Validate filters: Ensure field is selected and range is picked
                        const unselectedFieldFilters = this.dateTimeFilters.filter(f => !f.field);
                        if (unselectedFieldFilters.length > 0) {
                            alert('Please select a field for all date/time filters.');
                            return;
                        }

                        const incompleteRangeFilters = this.dateTimeFilters.filter(f => !f.from || !f.to);
                        if (incompleteRangeFilters.length > 0) {
                            alert('Please select a valid date range for all filters.');
                            return;
                        }

                        const formData = {
                            requestName: ((document.getElementById('RequestName') as HTMLInputElement)?.value ?? '').trim(),
                            projectId: (document.getElementById('ProjectID') as HTMLSelectElement)?.value,
                            purpose: ((document.getElementById('RequestPurpose') as HTMLTextAreaElement)?.value ?? '').trim(),
                            datasetId: this.dataSet.DataSetID,
                            approvers: this.dataSet.Approvers,
                        };

                        const emptyFields: string[] = [];
                        if (!formData.requestName) emptyFields.push('Request Name');
                        if (!formData.purpose) emptyFields.push('Purpose');
                        if (emptyFields.length > 0) {
                            alert(`The following field(s) cannot be empty or whitespace only: ${emptyFields.join(', ')}.`);
                            return;
                        }

                        const specialCharPattern = /[<>"'`;\\{}|^~\[\]]/;
                        const invalidFields: string[] = [];
                        if (specialCharPattern.test(formData.requestName)) invalidFields.push('Request Name');
                        if (specialCharPattern.test(formData.purpose)) invalidFields.push('Purpose');
                        if (invalidFields.length > 0) {
                            alert(`The following field(s) contain invalid special characters: ${invalidFields.join(', ')}. Please remove them and try again.`);
                            return;
                        }

                        const response = await window.loomeApi.runApiRequest(API_SUBMIT_DATASET_REQUEST, {
                            "DataSetID": formData.datasetId,
                            "payload": {
                                approvers: formData.approvers,
                                assistProjectID: parseInt(formData.projectId),
                                purpose: formData.purpose,
                                requestName: formData.requestName,
                                dateTimeFilters: this.dateTimeFilters.map(f => ({
                                    field: f.field,
                                    from: f.from || null,
                                    to: f.to || null
                                }))
                            }
                        });

                        if (response && response.status_code && response.status_code >= 400) {
                            console.error(`Error ${response.status_code}: ${response.detail}`);
                            alert(`Error ${response.status_code}: ${response.detail}`);
                            return;
                        }
                        
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
                    this.currentPage = 1;
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

                    this.currentPage = 1;
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
            }, { signal });

            const columnDropdown = document.getElementById('columnNameDropdown') as HTMLDivElement | null;
            const dropdownMenu = columnDropdown?.querySelector('.dropdown-menu') as HTMLDivElement | null;
            const headerToggle = document.getElementById('columnNameToggle') as HTMLElement | null;

            if (headerToggle && dropdownMenu) {
                const searchInput = dropdownMenu.querySelector<HTMLInputElement>('#columnNameSearchInput');
                if (searchInput) {
                    searchInput.addEventListener('input', () => {
                        this.columnNameSearchTerm = searchInput.value.trim().toLowerCase();
                        const selStart = searchInput.selectionStart;
                        const selEnd = searchInput.selectionEnd;
                        this.renderColumnNameCheckboxes();
                        searchInput.focus();
                        try { searchInput.setSelectionRange(selStart ?? 0, selEnd ?? 0); } catch (_) {}
                    });
                }
                let activeScrollAncestors: HTMLElement[] = [];

                const getScrollableAncestors = (el: HTMLElement): HTMLElement[] => {
                    const ancestors: HTMLElement[] = [];
                    let current = el.parentElement;
                    while (current && current !== document.body) {
                        const style = window.getComputedStyle(current);
                        if (/(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)) {
                            ancestors.push(current);
                        }
                        current = current.parentElement;
                    }
                    return ancestors;
                };

                // Helper function to calculate and update position in real-time
                const repositionDropdown = () => {
                    const thCell = headerToggle.closest('.column-name-header-cell') as HTMLElement | null;
                    if (thCell && dropdownMenu.classList.contains('show')) {
                        const rect = thCell.getBoundingClientRect();
                        dropdownMenu.style.position = 'fixed';
                        dropdownMenu.style.top = `${rect.bottom}px`;
                        dropdownMenu.style.left = `${rect.left}px`;
                        dropdownMenu.style.right = 'auto';
                        dropdownMenu.style.minWidth = '250px';
                        dropdownMenu.style.zIndex = '2000001';
                    }
                };

                const cleanupScrollListeners = () => {
                    window.removeEventListener('scroll', repositionDropdown);
                    activeScrollAncestors.forEach(el => el.removeEventListener('scroll', repositionDropdown));
                    activeScrollAncestors = [];
                };

                const toggleFn = (event: Event) => {
                    event.stopPropagation();
                    const isVisible = dropdownMenu.classList.toggle('show');
                    headerToggle.setAttribute('aria-expanded', String(isVisible));

                    if (isVisible) {
                        // Move to body to bypass layout clipping rules
                        document.body.appendChild(dropdownMenu);
                        
                        // Calculate position immediately upon opening
                        repositionDropdown();

                        // Listen to window scroll and all scrollable ancestors
                        window.addEventListener('scroll', repositionDropdown, { passive: true });
                        const thCell = headerToggle.closest('.column-name-header-cell') as HTMLElement | null;
                        if (thCell) {
                            activeScrollAncestors = getScrollableAncestors(thCell);
                            activeScrollAncestors.forEach(el => el.addEventListener('scroll', repositionDropdown, { passive: true }));
                        }
                    } else {
                        cleanupScrollListeners();
                    }
                };

                headerToggle.addEventListener('click', toggleFn);
                headerToggle.addEventListener('keydown', (e) => {
                    if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
                        e.preventDefault();
                        toggleFn(e);
                    }
                });

                dropdownMenu.addEventListener('click', (event) => event.stopPropagation());

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
                        this.currentSortColumn = 'FolderName';
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
                        this.currentSortColumn = 'FolderName';
                        this.currentSortDirection = 'desc';
                        this.updateTable();
                    });
                }
                setSortButtonsState();

                // Ensure we close and cleanup if the user clicks away
                document.addEventListener('click', () => {
                    dropdownMenu.classList.remove('show');
                    headerToggle.setAttribute('aria-expanded', 'false');
                    cleanupScrollListeners();
                }, { signal });

                // Close dropdown on browser back/forward navigation
                window.addEventListener('popstate', () => {
                    dropdownMenu.classList.remove('show');
                    headerToggle.setAttribute('aria-expanded', 'false');
                    cleanupScrollListeners();
                }, { signal });
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
                    <td><div class="cell-text-wrap" title="${column.LogicalColumnName || ''}">${column.LogicalColumnName || ''}</div></td>
                    <td><div class="cell-text-wrap" title="${column.BusinessDescription || 'N/A'}">${column.BusinessDescription || 'N/A'}</div></td>
                    <td><div class="cell-text-wrap" title="${column.ExampleValue || 'N/A'}"><span class="code-cell">${column.ExampleValue || 'N/A'}</span></div></td>
                    <td>${column.Redact ? '<span class="mui-chip success">Yes</span>' : '<span class="mui-chip">No</span>'}</td>
                    <td>${column.Deidentify ? '<span class="mui-chip success">Yes</span>' : '<span class="mui-chip">No</span>'}</td>
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
            const isChecked = (e.target as HTMLInputElement).checked;
            options.forEach(opt => {
                if (isChecked) this.selectedColumnNames.add(opt);
                else this.selectedColumnNames.delete(opt);
            });
            // Directly update individual checkbox states without rebuilding DOM
            const checkboxInputs = listContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not(#columnNameSelectAll)');
            checkboxInputs.forEach(cb => {
                cb.checked = isChecked;
            });
            selectAllCheckbox.indeterminate = false;
            this.updateColumnFilterCount();
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
        }
        // Apply boolean filters
        if (this.redactedFilter === 'yes') filtered = filtered.filter(c => Boolean(c.Redact));
        else if (this.redactedFilter === 'no') filtered = filtered.filter(c => !Boolean(c.Redact));

        if (this.deidentifiedFilter === 'yes') filtered = filtered.filter(c => Boolean(c.Deidentify));
        else if (this.deidentifiedFilter === 'no') filtered = filtered.filter(c => !Boolean(c.Deidentify));

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



    private loadDatetimeFields = async (): Promise<void> => {
        try {
            const dataSetID = this.dataSet?.DataSetID;
            if (!dataSetID) return;
            const result = await window.loomeApi.runApiRequest(API_GET_DATETIME_FIELDS, { data_set_id: dataSetID });
            this.datetimeFields = Array.isArray(result)
                ? result.map((f: any) => ({
                    DataSetColumnID: f.DataSetColumnID,
                    ColumnName: f.ColumnName
                }))
                : [];
        } catch (e) {
            console.warn('Could not load datetime fields:', e);
            this.datetimeFields = [];
        }
    };

    private generateFilterRowHtml = (filter: DateTimeFilter): string => {
        const usedFields = new Set(this.dateTimeFilters.filter(f => f.id !== filter.id).map(f => f.field));
        const fieldOptions = this.datetimeFields
            .filter(f => !usedFields.has(f.ColumnName) || f.ColumnName === filter.field)
            .map(f => `<option value="${f.ColumnName}" ${filter.field === f.ColumnName ? 'selected' : ''}>${f.ColumnName}</option>`)
            .join('');

        return `
            <div class="filter-row" data-filter-id="${filter.id}">
                <div class="filter-row-fields">
                    <select class="form-input filter-field-select" data-filter-id="${filter.id}" data-prop="field" style="flex: 0 0 150px;">
                        <option value="">Select Field</option>
                        ${fieldOptions}
                    </select>
                    <div class="range-picker-row-container" data-filter-id="${filter.id}">
                        <input type="text" class="range-picker-input" placeholder="Select date range..." readonly="">
                    </div>
                </div>
                <button type="button" class="remove-filter-btn" data-filter-id="${filter.id}" title="Remove filter">
                    <span class="material-icons" style="font-size:18px">delete</span>
                </button>
            </div>
        `;
    };

    private renderDateTimeFilters = (): void => {
        const container = document.getElementById('dateTimeFiltersContainer');
        if (!container) return;

        // Cleanup existing range pickers
        this.rangePickers.forEach(p => p.destroy());
        this.rangePickers.clear();

        if (this.dateTimeFilters.length === 0) {
            container.innerHTML = '<p class="filter-empty-hint">No filters added.</p>';
        } else {
            container.innerHTML = this.dateTimeFilters.map(f => this.generateFilterRowHtml(f)).join('');

            // Initialize new range pickers
            this.dateTimeFilters.forEach(filter => {
                const pickerContainer = container.querySelector(`.range-picker-row-container[data-filter-id="${filter.id}"]`) as HTMLElement;
                if (pickerContainer) {
                    const picker = new RangeDatePicker(
                        pickerContainer,
                        filter.from,
                        filter.to,
                        (start, end) => {
                            const fmt = (d: Date) => {
                                const y = d.getFullYear();
                                const m = d.getMonth() + 1;
                                const day = d.getDate();
                                return `${y}-${m < 10 ? '0' + m : m}-${day < 10 ? '0' + day : day}`;
                            };
                            // Format: YYYY-MM-DD HH:mm:ss.SSS for SQL datetime compatibility
                            filter.from = start ? `${fmt(start)} 00:00:00.000` : '';
                            filter.to = end ? `${fmt(end)} 23:59:59.999` : '';
                        }
                    );
                    this.rangePickers.set(filter.id, picker);
                }
            });
        }

        const addFilterBtn = document.getElementById('addDateTimeFilterBtn') as HTMLButtonElement | null;
        if (addFilterBtn && this.datetimeFields.length > 0) {
            if (this.dateTimeFilters.length >= this.datetimeFields.length) {
                addFilterBtn.style.display = 'none';
            } else {
                addFilterBtn.style.display = 'inline-flex';
            }
        }
    };

    private safeParseJson(response: any): any {
        if (typeof response === 'string') {
            try {
                return JSON.parse(response);
            } catch {
                return response;
            }
        }
        return response;
    }

    private getFromAPI = async (API_ID: string, initialParams: any): Promise<any[]> => {
        let allResults: any[] = [];

        try {
            const initialResponse = await window.loomeApi.runApiRequest(API_ID, initialParams);
            const parsedInitial = this.safeParseJson(initialResponse);

            // Early exit if the response is null, undefined, etc.
            if (!parsedInitial) {
                console.log("API returned no data.");
                return [];
            }

            // --- DETECTION LOGIC ---
            if (parsedInitial.PageCount !== undefined && Array.isArray(parsedInitial.Results)) {
                // --- PAGINATED PATH ---
                console.log("Detected a paginated response.");

                allResults = parsedInitial.Results;
                const totalPages = parsedInitial.PageCount;

                if (totalPages > 1) {
                    for (let page = 2; page <= totalPages; page++) {
                        console.log(`Fetching page ${page} of ${totalPages}...`);

                        // Construct params for the next page, preserving other initial params
                        const params = { ...initialParams, "page": page };
                        console.log(params);
                        const response = await window.loomeApi.runApiRequest(API_ID, params);
                        const parsed = this.safeParseJson(response);

                        if (parsed && parsed.Results) {
                            allResults = allResults.concat(parsed.Results);
                        }
                    }
                }
            } else {
                // --- NON-PAGINATED PATH ---
                console.log("Detected a non-paginated response.");

                if (Array.isArray(parsedInitial)) {
                    allResults = parsedInitial;
                } else {
                    allResults = [parsedInitial];
                }
            }

            console.log(`Finished fetching for API ID ${API_ID}. Total items: ${allResults.length}`);
            return allResults;

        } catch (error) {
            console.error(`An error occurred while fetching from ${API_ID}:`, error);
            return [];
        }
    }

    private createRequestModal = async (): Promise<void> => {
        const modal = document.getElementById('requestDatasetModal');
        if (!modal) return;

        try {
            console.log('Fetching all projects from all pages...');
            
            // Use the new generic pagination function
            const allProjects = await this.getFromAPI(API_GET_PROJECTS, {
                pages: 1,
                page_size: 50
            });

            if (!Array.isArray(allProjects) || allProjects.length === 0) {
                throw new Error('No projects available or invalid response structure.');
            }

            const projectSelect = document.getElementById('ProjectID') as HTMLSelectElement;
            if (!projectSelect) {
                throw new Error('Project select element not found');
            }

            const defaultOption = projectSelect.options[0];
            projectSelect.innerHTML = '';
            projectSelect.appendChild(defaultOption);

            // Populate with all active projects from all pages
            allProjects.forEach((project: ProjectResponse['Results'][0]) => {
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

    public dispose = (): void => {
        if (this._listenerController) {
            this._listenerController.abort();
            this._listenerController = null;
        }

        // Clean up range pickers
        this.rangePickers.forEach(p => p.destroy());
        this.rangePickers.clear();

        const orphanedMenu = document.body.querySelector('#columnNameDropdownMenu');
        if (orphanedMenu) orphanedMenu.remove();
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