// mock-loome-api.js
// This mock file is auto-injected into index.html during Webpack build.
// It provides fake API responses for testing TREEntityFolder and TREEntityDB.

window.loomeApi = {
  get: async (url) => {
    console.log("Mock GET:", url);
    return {};
  },
  post: async (url, data) => {
    console.log("Mock POST:", url, data);
    return {};
  },
  put: async (url, data) => {
    console.log("Mock PUT:", url, data);
    return {};
  },
  delete: async (url, data) => {
    console.log("Mock DELETE:", url, data);
    return {};
  },
  acquireToken: async (scope) => {
    console.log("Mock acquireToken for scope:", scope);
    return "mock-token-12345";
  },

  // 🧠 Core mock dispatcher
  runApiRequest: async (id, params) => {
    console.log("Mock runApiRequest:", id, params);

    // === GetDatasetIDColumns ===
    if (id === "GetDatasetIDColumns") {
      return {
        CurrentPage: 1,
        PageCount: 1,
        PageSize: 10,
        RowCount: 5,
        FirstRowOnPage: 1,
        LastRowOnPage: 5,
        Results: [
          {
            ColumnName: "[Admission date time]",
            ColumnType: "datetime",
            LogicalColumnName: "Admission Date and time",
            BusinessDescription: "Date and time of admission to the hospital",
            ExampleValue: "2022-05-23 21:35:00.000",
            Tokenise: false,
            TokenIdentifierType: 0,
            Redact: false,
            DisplayOrder: 4,
            IsFilter: true,
            DataSetColumnID: 14,
            DataSetID: 2,
          },
          {
            ColumnName: "[admission_bk]",
            ColumnType: "int",
            LogicalColumnName: "Business Key Admissions view",
            BusinessDescription:
              "Business Key for the Admissions view, also appears in the ED presentations view when the presentation is linked to an admission.",
            ExampleValue: "2582894",
            Tokenise: false,
            TokenIdentifierType: 0,
            Redact: false,
            DisplayOrder: 1,
            IsFilter: false,
            DataSetColumnID: 11,
            DataSetID: 2,
          },
        ],
      };
    }

    // === GetDataSetID ===
    if (id === "GetDataSetID") {
      return {
        Name: "migueltest1212",
        Description: "New test with Steven",
        DataSourceID: 1,
        IsActive: true,
        Approvers: "m@c",
        OptOutMessage: "string",
        OptOutList: "string",
        Owner: "m@c",
        OptOutColumn: "-1",
        DataSetID: 16,
        ModifiedDate: "2025-11-12T04:12:43.577000"
      };
    }

    // === GetAssistProjectsFilteredByUpn ===
    if (id === "GetAssistProjectsFilteredByUpn") {
      return {
        CurrentPage: 1,
        PageCount: 2,
        PageSize: 5,
        RowCount: 6,
        Results: [
          {
            AssistProjectID: 90,
            Name: "AllTesting-LLL",
            Description: "test project to verify the whole project cycle",
          },
          {
            AssistProjectID: 79,
            Name: "ProjTest-RiaY-1111-2222-3333-4444",
            Description: "",
          },
          {
            AssistProjectID: 42,
            Name: "SHeBa Administration",
            Description:
              "Assist project for SHeBa data manager(s) to perform admin tasks.",
          },
        ],
      };
    }

    // === GetRequests ===
    if (id === "GetRequests") {
      return [
        {
          name: "Project Alpha",
          projectDescription: "Sample project for testing",
          projectBudgetDto: { totalBudget: 10000 },
          spend: 4500,
          currency: "USD",
        },
        {
          name: "Project Beta",
          projectDescription: "Another sample project",
          projectBudgetDto: { totalBudget: 5000 },
          spend: 1200,
          currency: "EUR",
        },
      ];
    }

    // === GetDataSetFolderFileByDataSetID ===
    if (id === "GetDataSetFolderFileByDataSetID") {
      return [
        {
          FileType: ".csv",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 205,
          DataSetFolderID: 196,
          FolderName: "genomics"
        },
        {
          FileType: ".gz",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 206,
          DataSetFolderID: 197,
          FolderName: "genomics\annotations"
        },
        {
          FileType: ".zip",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 207,
          DataSetFolderID: 198,
          FolderName: "genomics\chrM-tutorial-data"
        },
        {
          FileType: ".clc",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 208,
          DataSetFolderID: 199,
          FolderName: "genomics\chrM-tutorial-data\cancerData"
        },
        {
          FileType: ".clc",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 209,
          DataSetFolderID: 200,
          FolderName: "genomics\chrM-tutorial-data\genomeTracks"
        },
        {
          FileType: ".clc",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 210,
          DataSetFolderID: 201,
          FolderName: "genomics\chrM-tutorial-data\normalData"
        },
        {
          FileType: ".fast5",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 211,
          DataSetFolderID: 202,
          FolderName: "genomics\nanopore"
        },
        {
          FileType: ".fastq",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 212,
          DataSetFolderID: 203,
          FolderName: "genomics\paeruginosa-reads"
        },
        {
          FileType: ".zip",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 213,
          DataSetFolderID: 203,
          FolderName: "genomics\paeruginosa-reads"
        },
        {
          FileType: ".fasta",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 214,
          DataSetFolderID: 204,
          FolderName: "genomics\proteins"
        },
        {
          FileType: ".gz",
          FileDescription: "",
          Redact: false,
          Tokenise: false,
          DataSetFolderFileID: 215,
          DataSetFolderID: 205,
          FolderName: "genomics\synthetic"
        }
      ];
    }

    // === Default ===
    return { access_token: "mock-token-12345" };
  },
};

// Simple error handler
window.errorCallback = function (title, subTitle, message, element) {
  console.error(`${title}: ${subTitle} - ${message}`);
  element.innerHTML = `
    <div style="color: red; padding: 20px; border: 1px solid red;">
      <h3>${title}</h3>
      <h4>${subTitle}</h4>
      <p>${message}</p>
    </div>
  `;
};
