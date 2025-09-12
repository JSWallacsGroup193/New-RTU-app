import { type ParsedModel, type Replacement } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Cache parsed models for faster lookups
  cacheParsedModel(modelNumber: string, parsed: ParsedModel): Promise<void>;
  getCachedModel(modelNumber: string): Promise<ParsedModel | undefined>;
  
  // Cache replacement results
  cacheReplacements(originalModel: string, replacements: Replacement[]): Promise<void>;
  getCachedReplacements(originalModel: string): Promise<Replacement[] | undefined>;
}

export class MemStorage implements IStorage {
  private parsedModelsCache: Map<string, ParsedModel>;
  private replacementsCache: Map<string, Replacement[]>;

  constructor() {
    this.parsedModelsCache = new Map();
    this.replacementsCache = new Map();
  }

  async cacheParsedModel(modelNumber: string, parsed: ParsedModel): Promise<void> {
    this.parsedModelsCache.set(modelNumber.toUpperCase(), parsed);
  }

  async getCachedModel(modelNumber: string): Promise<ParsedModel | undefined> {
    return this.parsedModelsCache.get(modelNumber.toUpperCase());
  }

  async cacheReplacements(originalModel: string, replacements: Replacement[]): Promise<void> {
    this.replacementsCache.set(originalModel.toUpperCase(), replacements);
  }

  async getCachedReplacements(originalModel: string): Promise<Replacement[] | undefined> {
    return this.replacementsCache.get(originalModel.toUpperCase());
  }
}

export const storage = new MemStorage();
