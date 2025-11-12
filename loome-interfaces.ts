
export {};

declare global {
    interface Window {
        loomeApi: {
            get: <T>(url: string) => Promise<T>;
            post: <T>(url: string, data?: any) => Promise<T>;
            put: <T>(url: string, data?: any) => Promise<T>;
            delete: <T>(url: string, data?: any) => Promise<T>;
            acquireToken: (scope: string) => Promise<string>;
            runApiRequest: (id: number | string, params?: Record<string, any>) => Promise<any>;
        }
    }
}