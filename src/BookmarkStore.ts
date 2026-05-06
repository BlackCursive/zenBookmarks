export interface NodeMetadata {
  color?: string;
  icon?: string;
  collapsed?: boolean;
}

export type MetadataStore = Record<string, NodeMetadata>;
