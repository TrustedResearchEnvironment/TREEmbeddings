export const getDatasetTemplate = (DataSet: any, columnsHtml: string): string => {
    return `
        <div class="dataset-container">
            <div class="breadcrumb">
                <span>Datasets</span>
                <span class="separator">›</span>
                <span class="current">Dataset Details</span>
            </div>
            
            <div class="dataset-card">
                <div class="dataset-header">
                    <div class="header-flex">
                        <h2>${DataSet.Name}</h2>
                        <button id="requestDatasetBtn" class="btn btn-success">
                            Request Dataset
                        </button>
                    </div>
                    <div class="metadata">
                        <span class="metadata-item">ID: ${DataSet.DataSetID}</span>
                        <span class="metadata-item">Owner: ${DataSet.Owner}</span>
                        <span class="metadata-item">Modified: ${new Date(DataSet.ModifiedDate).toLocaleDateString()}</span>
                    </div>
                    <div class="dataset-description">
                        <p>${DataSet.Description}</p>
                    </div>
                </div>
                ${columnsHtml}
            </div>
        </div>
    `;
};