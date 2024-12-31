import { mysqlData, AuthenticationState } from '../Types';
export declare const useSqlAuthState: (config: {
    host: string;
    user: string;
    password: string;
    database: string;
    tableName?: string;
    session?: string;
}) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    clear: () => Promise<void>;
    removeCreds: () => Promise<void>;
    query: (tableName: string, docId: string) => Promise<mysqlData | null>;
}>;
