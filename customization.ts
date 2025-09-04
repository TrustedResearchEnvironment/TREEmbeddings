export namespace Customization {
    export interface CustomizationLibrary {
        version: string;
        embedding: Embedding;
    }

    // Extend HTMLElement, so we can store the instance of the library on the element we're hooking the directive to.
    export interface HTMLElementWithCleanup extends HTMLElement {
        instance?: any;
    }

    interface Embedding {
        run(element: HTMLElementWithCleanup, entityUrl: string, paramValues: ParamValue[], settings: Setting[], errorCallback: (title: string, subTitle: string, message: string, element: HTMLElementWithCleanup) => void): void;
        destroy(element: HTMLElement): void;        
    }

    export interface ParamValue {
        id: string;
        value: any; /* string, boolean, string[] */
    }

    export interface Setting {
        name: string;
        value: any;
    }
}
