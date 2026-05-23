export interface LicenseData {
    email: string;
    tier: "free" | "pro";
    issued: string;
    expires: string;
}
export declare function parseLicense(key: string): LicenseData | null;
export declare function validateLicense(licenseKey?: string): {
    valid: boolean;
    data?: LicenseData;
    error?: string;
};
/**
 * License guard for tool calls.
 * Returns a tool result error if unlicensed, null if OK.
 */
export declare function checkLicense(): {
    data: LicenseData;
} | {
    error: string;
};
export declare function getFreeUsage(): number;
export declare function printLicenseBanner(): void;
