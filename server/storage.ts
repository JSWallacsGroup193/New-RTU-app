import { 
  type ParsedModel, 
  type Replacement,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type ProjectUnit,
  type InsertProjectUnit,
  type EnhancedReplacement,
  type UserCorrection,
  type InsertUserCorrection,
  type PatternLearning,
  type InsertPatternLearning,
  type MatchFeedback,
  type InsertMatchFeedback,
  type SpecUpdate,
  type InsertSpecUpdate,
  type LearningMetric,
  type InsertLearningMetric,
  type ManufacturerPattern,
  type InsertManufacturerPattern
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

  // ============================================================================
  // LEARNING SYSTEM OPERATIONS
  // ============================================================================

  // User correction operations
  createUserCorrection(correctionData: InsertUserCorrection): Promise<UserCorrection>;
  getUserCorrections(sessionId?: string, userId?: string): Promise<UserCorrection[]>;
  getUserCorrectionById(id: string): Promise<UserCorrection | undefined>;
  updateUserCorrection(id: string, updates: Partial<InsertUserCorrection>): Promise<UserCorrection | undefined>;
  getUserCorrectionsByModelNumber(modelNumber: string): Promise<UserCorrection[]>;
  markCorrectionAppliedToPattern(id: string, patternVersion: number): Promise<boolean>;

  // Pattern learning operations
  createPatternLearning(patternData: InsertPatternLearning): Promise<PatternLearning>;
  getPatternLearnings(manufacturer?: string, isActive?: boolean): Promise<PatternLearning[]>;
  getPatternLearningById(id: string): Promise<PatternLearning | undefined>;
  updatePatternLearning(id: string, updates: Partial<InsertPatternLearning>): Promise<PatternLearning | undefined>;
  incrementPatternUsage(id: string, success: boolean): Promise<boolean>;
  getActivePatternsByManufacturer(manufacturer: string): Promise<PatternLearning[]>;
  deactivatePattern(id: string): Promise<boolean>;

  // Match feedback operations
  createMatchFeedback(feedbackData: InsertMatchFeedback): Promise<MatchFeedback>;
  getMatchFeedback(sessionId?: string, userId?: string): Promise<MatchFeedback[]>;
  getMatchFeedbackById(id: string): Promise<MatchFeedback | undefined>;
  getMatchFeedbackByModelNumber(modelNumber: string): Promise<MatchFeedback[]>;
  markFeedbackAppliedToMatcher(id: string, matcherVersion: number): Promise<boolean>;
  getMatchFeedbackStats(modelNumber?: string): Promise<{
    totalFeedback: number;
    averageRating: number;
    satisfactionScore: number;
    feedbackByType: Record<string, number>;
  }>;

  // Spec update operations
  createSpecUpdate(specData: InsertSpecUpdate): Promise<SpecUpdate>;
  getSpecUpdates(manufacturerName?: string, isValidated?: boolean): Promise<SpecUpdate[]>;
  getSpecUpdateById(id: string): Promise<SpecUpdate | undefined>;
  getSpecUpdatesByModelNumber(manufacturerName: string, modelNumber: string): Promise<SpecUpdate[]>;
  validateSpecUpdate(id: string, validatedBy: string, notes?: string): Promise<boolean>;
  getLatestSpecUpdate(manufacturerName: string, modelNumber: string): Promise<SpecUpdate | undefined>;

  // Learning metrics operations
  createLearningMetric(metricData: InsertLearningMetric): Promise<LearningMetric>;
  getLearningMetrics(startDate?: Date, endDate?: Date, metricType?: string): Promise<LearningMetric[]>;
  getLearningMetricById(id: string): Promise<LearningMetric | undefined>;
  getLatestMetricsByType(metricType: string, limit?: number): Promise<LearningMetric[]>;
  getLearningAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalCorrections: number;
    totalFeedback: number;
    averageAccuracy: number;
    activePatternsCount: number;
    topManufacturers: string[];
    improvementTrends: {
      parsingAccuracy: "improving" | "stable" | "declining";
      matchQuality: "improving" | "stable" | "declining";
      userSatisfaction: "improving" | "stable" | "declining";
    };
  }>;

  // Manufacturer pattern operations
  createManufacturerPattern(patternData: InsertManufacturerPattern): Promise<ManufacturerPattern>;
  getManufacturerPatterns(manufacturer?: string, isActive?: boolean): Promise<ManufacturerPattern[]>;
  getManufacturerPatternById(id: string): Promise<ManufacturerPattern | undefined>;
  updateManufacturerPattern(id: string, updates: Partial<InsertManufacturerPattern>): Promise<ManufacturerPattern | undefined>;
  incrementPatternMatchCount(id: string, success: boolean): Promise<boolean>;
  getPatternsByPriority(manufacturer: string, isActive?: boolean): Promise<ManufacturerPattern[]>;
  flagPatternForReview(id: string, reason?: string): Promise<boolean>;
  learnNewPattern(manufacturer: string, modelNumbers: string[], extractedData: any[]): Promise<ManufacturerPattern>;
}

export class MemStorage implements IStorage {
  private parsedModelsCache: Map<string, ParsedModel>;
  private replacementsCache: Map<string, Replacement[]>;
  private users: Map<string, User>;
  private usersByEmail: Map<string, User>;
  private projects: Map<string, Project>;
  private projectUnits: Map<string, ProjectUnit>;
  private projectUnitsByProject: Map<string, string[]>; // projectId -> unitIds[]
  
  // Learning system storage
  private userCorrections: Map<string, UserCorrection>;
  private patternLearnings: Map<string, PatternLearning>;
  private matchFeedback: Map<string, MatchFeedback>;
  private specUpdates: Map<string, SpecUpdate>;
  private learningMetrics: Map<string, LearningMetric>;
  private manufacturerPatterns: Map<string, ManufacturerPattern>;

  constructor() {
    this.parsedModelsCache = new Map();
    this.replacementsCache = new Map();
    this.users = new Map();
    this.usersByEmail = new Map();
    this.projects = new Map();
    this.projectUnits = new Map();
    this.projectUnitsByProject = new Map();
    
    // Initialize learning system storage
    this.userCorrections = new Map();
    this.patternLearnings = new Map();
    this.matchFeedback = new Map();
    this.specUpdates = new Map();
    this.learningMetrics = new Map();
    this.manufacturerPatterns = new Map();
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

  // ============================================================================
  // LEARNING SYSTEM OPERATIONS IMPLEMENTATION
  // ============================================================================

  // User correction operations
  async createUserCorrection(correctionData: InsertUserCorrection): Promise<UserCorrection> {
    const id = this.generateId();
    const now = new Date();
    const correction: UserCorrection = {
      id,
      userId: correctionData.userId || null,
      sessionId: correctionData.sessionId,
      originalModelNumber: correctionData.originalModelNumber,
      originalParsedData: correctionData.originalParsedData,
      correctedParsedData: correctionData.correctedParsedData,
      correctionType: correctionData.correctionType,
      correctionReason: correctionData.correctionReason || null,
      confidence: correctionData.confidence || 1.0,
      appliedToPattern: false,
      patternVersion: correctionData.patternVersion || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.userCorrections.set(id, correction);
    return correction;
  }

  async getUserCorrections(sessionId?: string, userId?: string): Promise<UserCorrection[]> {
    const corrections = Array.from(this.userCorrections.values());
    
    return corrections.filter(correction => {
      if (sessionId && correction.sessionId !== sessionId) return false;
      if (userId && correction.userId !== userId) return false;
      return true;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserCorrectionById(id: string): Promise<UserCorrection | undefined> {
    return this.userCorrections.get(id);
  }

  async updateUserCorrection(id: string, updates: Partial<InsertUserCorrection>): Promise<UserCorrection | undefined> {
    const correction = this.userCorrections.get(id);
    if (!correction) return undefined;

    const updatedCorrection: UserCorrection = {
      ...correction,
      ...updates,
      id: correction.id, // Keep original ID
      updatedAt: new Date()
    };

    this.userCorrections.set(id, updatedCorrection);
    return updatedCorrection;
  }

  async getUserCorrectionsByModelNumber(modelNumber: string): Promise<UserCorrection[]> {
    return Array.from(this.userCorrections.values())
      .filter(correction => correction.originalModelNumber.toUpperCase() === modelNumber.toUpperCase())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markCorrectionAppliedToPattern(id: string, patternVersion: number): Promise<boolean> {
    const correction = this.userCorrections.get(id);
    if (!correction) return false;

    correction.appliedToPattern = true;
    correction.patternVersion = patternVersion;
    correction.updatedAt = new Date();
    
    this.userCorrections.set(id, correction);
    return true;
  }

  // Pattern learning operations
  async createPatternLearning(patternData: InsertPatternLearning): Promise<PatternLearning> {
    const id = this.generateId();
    const now = new Date();
    const pattern: PatternLearning = {
      id,
      manufacturer: patternData.manufacturer,
      patternType: patternData.patternType,
      version: patternData.version || 1,
      parentVersion: patternData.parentVersion || null,
      isActive: patternData.isActive !== false,
      patternDefinition: patternData.patternDefinition,
      parsingLogic: patternData.parsingLogic,
      successRate: patternData.successRate || 0,
      correctionCount: patternData.correctionCount || 0,
      usageCount: patternData.usageCount || 0,
      confidenceScore: patternData.confidenceScore || 0.5,
      learnedFromCorrections: patternData.learnedFromCorrections || [],
      createdBySystem: patternData.createdBySystem !== false,
      createdAt: now,
      updatedAt: now
    };
    
    this.patternLearnings.set(id, pattern);
    return pattern;
  }

  async getPatternLearnings(manufacturer?: string, isActive?: boolean): Promise<PatternLearning[]> {
    const patterns = Array.from(this.patternLearnings.values());
    
    return patterns.filter(pattern => {
      if (manufacturer && pattern.manufacturer !== manufacturer) return false;
      if (isActive !== undefined && pattern.isActive !== isActive) return false;
      return true;
    }).sort((a, b) => b.version - a.version);
  }

  async getPatternLearningById(id: string): Promise<PatternLearning | undefined> {
    return this.patternLearnings.get(id);
  }

  async updatePatternLearning(id: string, updates: Partial<InsertPatternLearning>): Promise<PatternLearning | undefined> {
    const pattern = this.patternLearnings.get(id);
    if (!pattern) return undefined;

    const updatedPattern: PatternLearning = {
      ...pattern,
      ...updates,
      id: pattern.id, // Keep original ID
      updatedAt: new Date()
    };

    this.patternLearnings.set(id, updatedPattern);
    return updatedPattern;
  }

  async incrementPatternUsage(id: string, success: boolean): Promise<boolean> {
    const pattern = this.patternLearnings.get(id);
    if (!pattern) return false;

    const currentUsage = (pattern.usageCount || 0) + 1;
    const currentSuccess = pattern.successRate || 0;
    
    pattern.usageCount = currentUsage;
    if (success) {
      pattern.successRate = (currentSuccess * (currentUsage - 1) + 1) / currentUsage;
    } else {
      pattern.successRate = (currentSuccess * (currentUsage - 1)) / currentUsage;
    }
    pattern.updatedAt = new Date();
    
    this.patternLearnings.set(id, pattern);
    return true;
  }

  async getActivePatternsByManufacturer(manufacturer: string): Promise<PatternLearning[]> {
    return this.getPatternLearnings(manufacturer, true);
  }

  async deactivatePattern(id: string): Promise<boolean> {
    const pattern = this.patternLearnings.get(id);
    if (!pattern) return false;

    pattern.isActive = false;
    pattern.updatedAt = new Date();
    
    this.patternLearnings.set(id, pattern);
    return true;
  }

  // Match feedback operations
  async createMatchFeedback(feedbackData: InsertMatchFeedback): Promise<MatchFeedback> {
    const id = this.generateId();
    const now = new Date();
    const feedback: MatchFeedback = {
      id,
      userId: feedbackData.userId || null,
      sessionId: feedbackData.sessionId,
      originalModelNumber: feedbackData.originalModelNumber,
      parsedSpecs: feedbackData.parsedSpecs,
      suggestedMatches: feedbackData.suggestedMatches,
      chosenMatchId: feedbackData.chosenMatchId || null,
      alternativeMatches: feedbackData.alternativeMatches || [],
      feedbackType: feedbackData.feedbackType,
      feedbackRating: feedbackData.feedbackRating || null,
      feedbackComments: feedbackData.feedbackComments || null,
      capacityMatchQuality: feedbackData.capacityMatchQuality || null,
      specificationMatchQuality: feedbackData.specificationMatchQuality || null,
      userSatisfactionScore: feedbackData.userSatisfactionScore || null,
      appliedToMatcher: false,
      matcherVersion: feedbackData.matcherVersion || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.matchFeedback.set(id, feedback);
    return feedback;
  }

  async getMatchFeedback(sessionId?: string, userId?: string): Promise<MatchFeedback[]> {
    const feedback = Array.from(this.matchFeedback.values());
    
    return feedback.filter(item => {
      if (sessionId && item.sessionId !== sessionId) return false;
      if (userId && item.userId !== userId) return false;
      return true;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getMatchFeedbackById(id: string): Promise<MatchFeedback | undefined> {
    return this.matchFeedback.get(id);
  }

  async getMatchFeedbackByModelNumber(modelNumber: string): Promise<MatchFeedback[]> {
    return Array.from(this.matchFeedback.values())
      .filter(feedback => feedback.originalModelNumber.toUpperCase() === modelNumber.toUpperCase())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markFeedbackAppliedToMatcher(id: string, matcherVersion: number): Promise<boolean> {
    const feedback = this.matchFeedback.get(id);
    if (!feedback) return false;

    feedback.appliedToMatcher = true;
    feedback.matcherVersion = matcherVersion;
    feedback.updatedAt = new Date();
    
    this.matchFeedback.set(id, feedback);
    return true;
  }

  async getMatchFeedbackStats(modelNumber?: string): Promise<{
    totalFeedback: number;
    averageRating: number;
    satisfactionScore: number;
    feedbackByType: Record<string, number>;
  }> {
    let feedback = Array.from(this.matchFeedback.values());
    
    if (modelNumber) {
      feedback = feedback.filter(item => 
        item.originalModelNumber.toUpperCase() === modelNumber.toUpperCase()
      );
    }
    
    const totalFeedback = feedback.length;
    const ratingsWithValues = feedback.filter(item => item.feedbackRating !== null);
    const averageRating = ratingsWithValues.length > 0 ? 
      ratingsWithValues.reduce((sum, item) => sum + (item.feedbackRating || 0), 0) / ratingsWithValues.length : 0;
    
    const satisfactionWithValues = feedback.filter(item => item.userSatisfactionScore !== null);
    const satisfactionScore = satisfactionWithValues.length > 0 ?
      satisfactionWithValues.reduce((sum, item) => sum + (item.userSatisfactionScore || 0), 0) / satisfactionWithValues.length : 0;
    
    const feedbackByType: Record<string, number> = {};
    feedback.forEach(item => {
      feedbackByType[item.feedbackType] = (feedbackByType[item.feedbackType] || 0) + 1;
    });
    
    return {
      totalFeedback,
      averageRating,
      satisfactionScore,
      feedbackByType
    };
  }

  // Spec update operations
  async createSpecUpdate(specData: InsertSpecUpdate): Promise<SpecUpdate> {
    const id = this.generateId();
    const now = new Date();
    const specUpdate: SpecUpdate = {
      id,
      updateType: specData.updateType,
      manufacturerName: specData.manufacturerName,
      modelNumber: specData.modelNumber,
      version: specData.version || 1,
      previousVersion: specData.previousVersion || null,
      changedFields: specData.changedFields,
      oldData: specData.oldData || null,
      newData: specData.newData,
      changeReason: specData.changeReason,
      isValidated: specData.isValidated || false,
      validatedBy: specData.validatedBy || null,
      validationNotes: specData.validationNotes || null,
      sourceType: specData.sourceType,
      sourceReference: specData.sourceReference || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.specUpdates.set(id, specUpdate);
    return specUpdate;
  }

  async getSpecUpdates(manufacturerName?: string, isValidated?: boolean): Promise<SpecUpdate[]> {
    const updates = Array.from(this.specUpdates.values());
    
    return updates.filter(update => {
      if (manufacturerName && update.manufacturerName !== manufacturerName) return false;
      if (isValidated !== undefined && update.isValidated !== isValidated) return false;
      return true;
    }).sort((a, b) => b.version - a.version);
  }

  async getSpecUpdateById(id: string): Promise<SpecUpdate | undefined> {
    return this.specUpdates.get(id);
  }

  async getSpecUpdatesByModelNumber(manufacturerName: string, modelNumber: string): Promise<SpecUpdate[]> {
    return Array.from(this.specUpdates.values())
      .filter(update => 
        update.manufacturerName === manufacturerName && 
        update.modelNumber.toUpperCase() === modelNumber.toUpperCase()
      )
      .sort((a, b) => b.version - a.version);
  }

  async validateSpecUpdate(id: string, validatedBy: string, notes?: string): Promise<boolean> {
    const update = this.specUpdates.get(id);
    if (!update) return false;

    update.isValidated = true;
    update.validatedBy = validatedBy;
    update.validationNotes = notes || null;
    update.updatedAt = new Date();
    
    this.specUpdates.set(id, update);
    return true;
  }

  async getLatestSpecUpdate(manufacturerName: string, modelNumber: string): Promise<SpecUpdate | undefined> {
    const updates = await this.getSpecUpdatesByModelNumber(manufacturerName, modelNumber);
    return updates.length > 0 ? updates[0] : undefined;
  }

  // Learning metrics operations
  async createLearningMetric(metricData: InsertLearningMetric): Promise<LearningMetric> {
    const id = this.generateId();
    const metric: LearningMetric = {
      id,
      metricType: metricData.metricType,
      measurementDate: metricData.measurementDate || new Date(),
      periodType: metricData.periodType,
      successRate: metricData.successRate,
      improvementRate: metricData.improvementRate || null,
      errorRate: metricData.errorRate,
      correctionFrequency: metricData.correctionFrequency || null,
      userSatisfactionAvg: metricData.userSatisfactionAvg || null,
      feedbackVolume: metricData.feedbackVolume || null,
      activeUsers: metricData.activeUsers || null,
      parsingSpeed: metricData.parsingSpeed || null,
      matchAccuracy: metricData.matchAccuracy || null,
      patternCoverage: metricData.patternCoverage || null,
      newPatternsLearned: metricData.newPatternsLearned || null,
      patternsImproved: metricData.patternsImproved || null,
      totalPatternsActive: metricData.totalPatternsActive || null,
      createdAt: new Date()
    };
    
    this.learningMetrics.set(id, metric);
    return metric;
  }

  async getLearningMetrics(startDate?: Date, endDate?: Date, metricType?: string): Promise<LearningMetric[]> {
    const metrics = Array.from(this.learningMetrics.values());
    
    return metrics.filter(metric => {
      if (startDate && metric.measurementDate < startDate) return false;
      if (endDate && metric.measurementDate > endDate) return false;
      if (metricType && metric.metricType !== metricType) return false;
      return true;
    }).sort((a, b) => b.measurementDate.getTime() - a.measurementDate.getTime());
  }

  async getLearningMetricById(id: string): Promise<LearningMetric | undefined> {
    return this.learningMetrics.get(id);
  }

  async getLatestMetricsByType(metricType: string, limit: number = 10): Promise<LearningMetric[]> {
    const metrics = await this.getLearningMetrics(undefined, undefined, metricType);
    return metrics.slice(0, limit);
  }

  async getLearningAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalCorrections: number;
    totalFeedback: number;
    averageAccuracy: number;
    activePatternsCount: number;
    topManufacturers: string[];
    improvementTrends: {
      parsingAccuracy: "improving" | "stable" | "declining";
      matchQuality: "improving" | "stable" | "declining";
      userSatisfaction: "improving" | "stable" | "declining";
    };
  }> {
    const corrections = await this.getUserCorrections();
    const feedback = await this.getMatchFeedback();
    const patterns = await this.getPatternLearnings(undefined, true);
    const metrics = await this.getLearningMetrics(startDate, endDate);
    
    // Filter by date range
    const filteredCorrections = corrections.filter(c => {
      if (startDate && c.createdAt < startDate) return false;
      if (endDate && c.createdAt > endDate) return false;
      return true;
    });
    
    const filteredFeedback = feedback.filter(f => {
      if (startDate && f.createdAt < startDate) return false;
      if (endDate && f.createdAt > endDate) return false;
      return true;
    });
    
    // Calculate analytics
    const totalCorrections = filteredCorrections.length;
    const totalFeedback = filteredFeedback.length;
    
    const avgAccuracyMetrics = metrics.filter(m => m.metricType === "parsing_accuracy");
    const averageAccuracy = avgAccuracyMetrics.length > 0 ?
      avgAccuracyMetrics.reduce((sum, m) => sum + m.successRate, 0) / avgAccuracyMetrics.length : 0;
    
    const activePatternsCount = patterns.length;
    
    // Get top manufacturers from corrections
    const manufacturerCounts: Record<string, number> = {};
    filteredCorrections.forEach(correction => {
      const parsed = correction.originalParsedData as any;
      if (parsed && parsed.manufacturer) {
        manufacturerCounts[parsed.manufacturer] = (manufacturerCounts[parsed.manufacturer] || 0) + 1;
      }
    });
    
    const topManufacturers = Object.entries(manufacturerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([manufacturer]) => manufacturer);
    
    // Calculate improvement trends (simplified - would need more sophisticated logic)
    const getTrend = (metricType: string): "improving" | "stable" | "declining" => {
      const recentMetrics = metrics
        .filter(m => m.metricType === metricType)
        .sort((a, b) => b.measurementDate.getTime() - a.measurementDate.getTime())
        .slice(0, 5);
      
      if (recentMetrics.length < 2) return "stable";
      
      const recent = recentMetrics[0].successRate;
      const older = recentMetrics[recentMetrics.length - 1].successRate;
      
      if (recent > older * 1.05) return "improving";
      if (recent < older * 0.95) return "declining";
      return "stable";
    };
    
    return {
      totalCorrections,
      totalFeedback,
      averageAccuracy,
      activePatternsCount,
      topManufacturers,
      improvementTrends: {
        parsingAccuracy: getTrend("parsing_accuracy"),
        matchQuality: getTrend("match_quality"),
        userSatisfaction: getTrend("user_satisfaction")
      }
    };
  }

  // Manufacturer pattern operations
  async createManufacturerPattern(patternData: InsertManufacturerPattern): Promise<ManufacturerPattern> {
    const id = this.generateId();
    const now = new Date();
    const pattern: ManufacturerPattern = {
      id,
      manufacturer: patternData.manufacturer,
      patternName: patternData.patternName,
      regexPattern: patternData.regexPattern,
      extractionRules: patternData.extractionRules,
      validationRules: patternData.validationRules || [],
      description: patternData.description || null,
      examples: patternData.examples || [],
      counterExamples: patternData.counterExamples || [],
      matchCount: patternData.matchCount || 0,
      successCount: patternData.successCount || 0,
      errorCount: patternData.errorCount || 0,
      lastUsed: patternData.lastUsed || null,
      learnedFromModelNumbers: patternData.learnedFromModelNumbers || [],
      confidence: patternData.confidence || 0.5,
      priority: patternData.priority || 100,
      isLearned: patternData.isLearned !== false,
      isActive: patternData.isActive !== false,
      needsReview: patternData.needsReview || false,
      createdAt: now,
      updatedAt: now
    };
    
    this.manufacturerPatterns.set(id, pattern);
    return pattern;
  }

  async getManufacturerPatterns(manufacturer?: string, isActive?: boolean): Promise<ManufacturerPattern[]> {
    const patterns = Array.from(this.manufacturerPatterns.values());
    
    return patterns.filter(pattern => {
      if (manufacturer && pattern.manufacturer !== manufacturer) return false;
      if (isActive !== undefined && pattern.isActive !== isActive) return false;
      return true;
    }).sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  async getManufacturerPatternById(id: string): Promise<ManufacturerPattern | undefined> {
    return this.manufacturerPatterns.get(id);
  }

  async updateManufacturerPattern(id: string, updates: Partial<InsertManufacturerPattern>): Promise<ManufacturerPattern | undefined> {
    const pattern = this.manufacturerPatterns.get(id);
    if (!pattern) return undefined;

    const updatedPattern: ManufacturerPattern = {
      ...pattern,
      ...updates,
      id: pattern.id, // Keep original ID
      updatedAt: new Date()
    };

    this.manufacturerPatterns.set(id, updatedPattern);
    return updatedPattern;
  }

  async incrementPatternMatchCount(id: string, success: boolean): Promise<boolean> {
    const pattern = this.manufacturerPatterns.get(id);
    if (!pattern) return false;

    const currentMatchCount = (pattern.matchCount || 0) + 1;
    const currentSuccessCount = pattern.successCount || 0;
    const currentErrorCount = pattern.errorCount || 0;
    
    pattern.matchCount = currentMatchCount;
    pattern.lastUsed = new Date();
    
    if (success) {
      pattern.successCount = currentSuccessCount + 1;
      // Update confidence based on success rate
      pattern.confidence = Math.min(0.95, pattern.successCount / pattern.matchCount);
    } else {
      pattern.errorCount = currentErrorCount + 1;
      // Decrease confidence for errors
      pattern.confidence = Math.max(0.05, (pattern.successCount || 0) / pattern.matchCount * 0.9);
    }
    
    pattern.updatedAt = new Date();
    this.manufacturerPatterns.set(id, pattern);
    return true;
  }

  async getPatternsByPriority(manufacturer: string, isActive: boolean = true): Promise<ManufacturerPattern[]> {
    return this.getManufacturerPatterns(manufacturer, isActive);
  }

  async flagPatternForReview(id: string, reason?: string): Promise<boolean> {
    const pattern = this.manufacturerPatterns.get(id);
    if (!pattern) return false;

    pattern.needsReview = true;
    pattern.description = reason ? `${pattern.description || ''}\n[REVIEW]: ${reason}` : pattern.description;
    pattern.updatedAt = new Date();
    
    this.manufacturerPatterns.set(id, pattern);
    return true;
  }

  async learnNewPattern(manufacturer: string, modelNumbers: string[], extractedData: any[]): Promise<ManufacturerPattern> {
    // This is a simplified implementation - would need sophisticated pattern learning logic
    const patternName = `Learned_${manufacturer}_${Date.now()}`;
    
    // Generate a basic regex pattern based on common structure
    const regexPattern = this.generatePatternFromExamples(modelNumbers);
    
    // Create extraction rules based on extracted data
    const extractionRules = this.generateExtractionRules(modelNumbers, extractedData);
    
    return this.createManufacturerPattern({
      manufacturer,
      patternName,
      regexPattern,
      extractionRules,
      examples: modelNumbers,
      learnedFromModelNumbers: modelNumbers,
      isLearned: true,
      confidence: 0.6, // Start with moderate confidence
      description: `Auto-learned pattern for ${manufacturer} from ${modelNumbers.length} examples`
    });
  }

  // Utility method for generating IDs
  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  // Helper methods for pattern learning
  private generatePatternFromExamples(modelNumbers: string[]): string {
    // Simplified pattern generation - would need more sophisticated logic
    if (modelNumbers.length === 0) return ".*";
    
    // Find common structure
    const firstModel = modelNumbers[0];
    let pattern = "";
    
    for (let i = 0; i < firstModel.length; i++) {
      const char = firstModel[i];
      const allSame = modelNumbers.every(model => model[i] === char);
      
      if (allSame) {
        pattern += char === '.' ? '\\.' : char;
      } else if (/\d/.test(char)) {
        pattern += "\\d+";
      } else if (/[A-Za-z]/.test(char)) {
        pattern += "[A-Za-z]+";
      } else {
        pattern += ".";
      }
    }
    
    return pattern;
  }

  private generateExtractionRules(modelNumbers: string[], extractedData: any[]): any {
    // Simplified extraction rule generation
    return {
      capacityExtraction: {
        method: "regex_group",
        pattern: "(\\d{2,3})",
        transform: "btU_lookup"
      },
      manufacturerExtraction: {
        method: "fixed_value",
        value: extractedData[0]?.manufacturer || "Unknown"
      },
      systemTypeExtraction: {
        method: "pattern_match",
        patterns: {
          "HP": "Heat Pump",
          "AC": "Straight A/C",
          "GE": "Gas/Electric"
        }
      }
    };
  }
}

export const storage = new MemStorage();
