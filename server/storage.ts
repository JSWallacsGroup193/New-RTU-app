import { 
  type ParsedModel, 
  type Replacement,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type ProjectUnit,
  type InsertProjectUnit,
  type EnhancedReplacement
} from "@shared/schema";

// Comprehensive storage interface for project management
export interface IStorage {
  // Legacy cache methods for parsed models and replacements
  cacheParsedModel(modelNumber: string, parsed: ParsedModel): Promise<void>;
  getCachedModel(modelNumber: string): Promise<ParsedModel | undefined>;
  cacheReplacements(originalModel: string, replacements: Replacement[]): Promise<void>;
  getCachedReplacements(originalModel: string): Promise<Replacement[] | undefined>;

  // User management operations
  createUser(userData: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;

  // Project management operations
  createProject(projectData: InsertProject): Promise<Project>;
  getProjectById(id: string): Promise<Project | undefined>;
  listProjectsByOwner(ownerId: string): Promise<Project[]>;
  updateProject(id: string, projectData: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  getProjectUnitCount(projectId: string): Promise<number>;

  // Project unit management operations
  addUnitToProject(unitData: InsertProjectUnit): Promise<ProjectUnit>;
  removeUnitFromProject(unitId: string): Promise<boolean>;
  updateProjectUnit(unitId: string, unitData: Partial<InsertProjectUnit>): Promise<ProjectUnit | undefined>;
  getProjectUnits(projectId: string): Promise<ProjectUnit[]>;
  getProjectUnitById(unitId: string): Promise<ProjectUnit | undefined>;

  // Project capacity management (20-unit limit enforcement)
  canAddUnitsToProject(projectId: string, unitsToAdd: number): Promise<boolean>;
  getRemainingProjectCapacity(projectId: string): Promise<number>;

  // Search and filtering operations
  searchProjects(ownerId: string, query?: string): Promise<Project[]>;
  getRecentProjects(ownerId: string, limit?: number): Promise<Project[]>;
}

export class MemStorage implements IStorage {
  private parsedModelsCache: Map<string, ParsedModel>;
  private replacementsCache: Map<string, Replacement[]>;
  private users: Map<string, User>;
  private usersByEmail: Map<string, User>;
  private projects: Map<string, Project>;
  private projectUnits: Map<string, ProjectUnit>;
  private projectUnitsByProject: Map<string, string[]>; // projectId -> unitIds[]

  constructor() {
    this.parsedModelsCache = new Map();
    this.replacementsCache = new Map();
    this.users = new Map();
    this.usersByEmail = new Map();
    this.projects = new Map();
    this.projectUnits = new Map();
    this.projectUnitsByProject = new Map();
  }

  // Legacy cache methods
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

  // User management operations
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.generateId();
    const now = new Date();
    const user: User = {
      id,
      email: userData.email,
      name: userData.name,
      company: userData.company || null,
      preferences: userData.preferences || {},
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(id, user);
    this.usersByEmail.set(userData.email.toLowerCase(), user);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email.toLowerCase());
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ...userData,
      id: user.id, // Keep original ID
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    this.usersByEmail.set(updatedUser.email.toLowerCase(), updatedUser);
    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Project management operations
  async createProject(projectData: InsertProject): Promise<Project> {
    const id = this.generateId();
    const now = new Date();
    const project: Project = {
      id,
      name: projectData.name,
      ownerId: projectData.ownerId,
      description: projectData.description || null,
      customerName: projectData.customerName || null,
      customerLocation: projectData.customerLocation || null,
      projectDate: projectData.projectDate || null,
      status: (projectData.status as "draft" | "in_progress" | "completed") || "draft",
      createdAt: now,
      updatedAt: now
    };
    
    this.projects.set(id, project);
    this.projectUnitsByProject.set(id, []);
    return project;
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async listProjectsByOwner(ownerId: string): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateProject(id: string, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject: Project = {
      ...project,
      ...projectData,
      id: project.id, // Keep original ID
      updatedAt: new Date()
    };

    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const project = this.projects.get(id);
    if (!project) return false;

    // Remove all associated project units
    const unitIds = this.projectUnitsByProject.get(id) || [];
    unitIds.forEach(unitId => this.projectUnits.delete(unitId));
    
    // Remove project and its unit references
    this.projects.delete(id);
    this.projectUnitsByProject.delete(id);
    
    return true;
  }

  async getProjectUnitCount(projectId: string): Promise<number> {
    const unitIds = this.projectUnitsByProject.get(projectId) || [];
    return unitIds.length;
  }

  // Project unit management operations
  async addUnitToProject(unitData: InsertProjectUnit): Promise<ProjectUnit> {
    // Check 20-unit limit
    const currentCount = await this.getProjectUnitCount(unitData.projectId);
    if (currentCount >= 20) {
      throw new Error("Project has reached the maximum limit of 20 units");
    }

    const id = this.generateId();
    const now = new Date();
    const projectUnit: ProjectUnit = {
      id,
      projectId: unitData.projectId,
      originalModelNumber: unitData.originalModelNumber,
      originalManufacturer: unitData.originalManufacturer,
      chosenReplacementId: unitData.chosenReplacementId,
      chosenReplacementModel: unitData.chosenReplacementModel,
      configuration: unitData.configuration || {},
      notes: unitData.notes || "",
      status: unitData.status || "pending",
      createdAt: now,
      updatedAt: now
    };
    
    this.projectUnits.set(id, projectUnit);
    
    // Update project unit index
    const existingUnits = this.projectUnitsByProject.get(unitData.projectId) || [];
    this.projectUnitsByProject.set(unitData.projectId, [...existingUnits, id]);
    
    // Update project's updatedAt timestamp
    await this.updateProject(unitData.projectId, {});
    
    return projectUnit;
  }

  async removeUnitFromProject(unitId: string): Promise<boolean> {
    const unit = this.projectUnits.get(unitId);
    if (!unit) return false;

    // Remove from project units index
    const existingUnits = this.projectUnitsByProject.get(unit.projectId) || [];
    const updatedUnits = existingUnits.filter(id => id !== unitId);
    this.projectUnitsByProject.set(unit.projectId, updatedUnits);
    
    // Remove the unit
    this.projectUnits.delete(unitId);
    
    // Update project's updatedAt timestamp
    await this.updateProject(unit.projectId, {});
    
    return true;
  }

  async updateProjectUnit(unitId: string, unitData: Partial<InsertProjectUnit>): Promise<ProjectUnit | undefined> {
    const unit = this.projectUnits.get(unitId);
    if (!unit) return undefined;

    const updatedUnit: ProjectUnit = {
      ...unit,
      ...unitData,
      id: unit.id, // Keep original ID
      updatedAt: new Date()
    };

    this.projectUnits.set(unitId, updatedUnit);
    
    // Update project's updatedAt timestamp
    await this.updateProject(unit.projectId, {});
    
    return updatedUnit;
  }

  async getProjectUnits(projectId: string): Promise<ProjectUnit[]> {
    const unitIds = this.projectUnitsByProject.get(projectId) || [];
    return unitIds
      .map(unitId => this.projectUnits.get(unitId))
      .filter((unit): unit is ProjectUnit => unit !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProjectUnitById(unitId: string): Promise<ProjectUnit | undefined> {
    return this.projectUnits.get(unitId);
  }

  // Project capacity management (20-unit limit enforcement)
  async canAddUnitsToProject(projectId: string, unitsToAdd: number): Promise<boolean> {
    const currentCount = await this.getProjectUnitCount(projectId);
    return (currentCount + unitsToAdd) <= 20;
  }

  async getRemainingProjectCapacity(projectId: string): Promise<number> {
    const currentCount = await this.getProjectUnitCount(projectId);
    return Math.max(0, 20 - currentCount);
  }

  // Search and filtering operations
  async searchProjects(ownerId: string, query?: string): Promise<Project[]> {
    let projects = await this.listProjectsByOwner(ownerId);
    
    if (query) {
      const searchTerm = query.toLowerCase();
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(searchTerm) ||
        (project.description && project.description.toLowerCase().includes(searchTerm)) ||
        (project.customerName && project.customerName.toLowerCase().includes(searchTerm)) ||
        (project.customerLocation && project.customerLocation.toLowerCase().includes(searchTerm))
      );
    }
    
    return projects;
  }

  async getRecentProjects(ownerId: string, limit: number = 5): Promise<Project[]> {
    const projects = await this.listProjectsByOwner(ownerId);
    return projects.slice(0, limit);
  }

  // Utility method for generating IDs
  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

export const storage = new MemStorage();
