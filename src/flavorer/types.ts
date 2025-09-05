export interface BucketRule {
    when: string;
    pick: string[];
}

export interface TableSelector {
    kind: 'table';
    values: string[];
    byte: number; // 0..31
}

export interface BucketSelector {
    kind: 'bucket';
    rules: BucketRule[];
}

export interface AssemblyRule {
    when: string;
    use: string[];
}

export interface AssemblySelector {
    kind: 'assembly';
    rules: AssemblyRule[];
}

export type Selector = TableSelector | BucketSelector | AssemblySelector;

export interface TemplatesDef {
    title: string;
    text: string;
}

export interface ImageDef {
    style: string;
    description: string;
    negative?: string;
}

export interface AssemblyAdjectivesRule {
    when: string;
    use: string[]; // tokens referencing plan keys or bucket keys
}

export interface ThemeDefinition {
    schemaVersion: 1;
    themeId: string;
    locale: string;
    properties: Properties;
    selectors: Record<string, Selector>;
    type: string;
    palette: string;
    templates: TemplatesDef;
    image: ImageDef;
}

export type Properties = Record<string, string>;

export interface PropertyDef {
    key: string;
    label: string;
    value: number|string;
}

export interface Image {
    style: string;
    description: string;
    negative?: string;
}

export interface Flavor {
    properties: PropertyDef[];
    type: string;
    palette: string;
    title: string;
    text: string;
    image: Image;
    tags: string[];
}


