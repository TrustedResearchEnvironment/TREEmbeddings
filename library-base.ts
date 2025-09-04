import { Customization } from "./customization";

export abstract class LibraryBase {
    protected element: HTMLElement;
    protected entityUrl: string;
    protected paramValues: Customization.ParamValue[];
    protected settings: Customization.Setting[];
    protected errorCallback: (title: string, subTitle: string, message: string, element: HTMLElement) => void;

    protected embedType: number;
    protected embedId: number;

    constructor(element: HTMLElement, entityUrl: string, paramValues: Customization.ParamValue[], settings: Customization.Setting[],
        errorCallback: (title: string, subTitle: string, message: string, element: HTMLElement) => void) {

        this.element = element;
        this.entityUrl = entityUrl;
        this.paramValues = paramValues;
        this.settings = settings;
        this.errorCallback = errorCallback;

        const embedTypeSetting = this.getSettingValue('embedType');
        const embedIdSetting = this.getSettingValue('embedId');

        this.embedType = +embedTypeSetting?.value;
        this.embedId = +embedIdSetting?.value;
        
        this.setupEventListeners();
    }

    protected getSettingValue(name: string) {
        var matches = this.settings.filter(x => x.name == name);
        if (matches.length > 0) {
            return matches[0];
        } else {
            return undefined;
        }
    };

    protected getParamValue(id: string) {
        var matches = this.paramValues.filter(x => x.id == id);
        if (matches.length > 0) {
            return matches[0];
        } else {
            return undefined;
        }
    };

    protected getQueryStringParameter(url: string, key: string): string | undefined {
        var parts = url.split("?");
        if (parts.length === 1) return undefined;

        var paramKeys = parts[1].split("&").map(x => {
            var keyValuePair = x.split("=");
            return {
                key: keyValuePair[0],
                value: keyValuePair[1]
            }
        });

        var match = paramKeys.find(x => x.key.toLocaleUpperCase() === key.toLocaleUpperCase());
        return match === undefined ? undefined : match.value;
    }

    loadResourceFiles = async (): Promise<void> => {

    }

    setupEventListeners = (): void => {

    }

    dispose = (): void => {

    }
}