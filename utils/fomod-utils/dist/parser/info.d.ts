export interface FomodInfoMetadata {
    name?: string;
    author?: string;
    version?: string;
    website?: string;
}
export declare function parseInfoXml(parsed: Record<string, unknown>): FomodInfoMetadata;
