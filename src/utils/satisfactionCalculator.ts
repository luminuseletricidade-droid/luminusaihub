/**
 * Calculation engine for dynamic customer satisfaction based on real data
 * Completely eliminates fixed values and uses business metrics
 */

export interface SatisfactionData {
  // Maintenance metrics
  completedMaintenances: number;
  overdueMaintenances: number;
  pendingMaintenances: number;
  onTimeMaintenances: number;
  
  // Contract metrics  
  totalContracts: number;
  activeContracts: number;
  renewedContracts: number;
  cancelledContracts: number;
  newContractsThisMonth: number;
  
  // Service quality metrics
  averageResponseTime?: number; // in hours
  firstTimeFixRate?: number;    // percentage of issues fixed on first visit
  escalatedIssues?: number;     // issues that needed escalation
  
  // Client feedback (if available)
  clientRatings?: number[];     // array of ratings 1-5
  complaints?: number;          // formal complaints
  compliments?: number;         // positive feedback
  
  // Financial health
  overduePendingMaintenances?: number; // maintenance payment delays
  contractRenewalRate?: number;        // historical renewal rate
}

export class SatisfactionCalculator {
  
  /**
   * Main satisfaction calculation function
   * Uses weighted multi-factor analysis
   */
  static calculateSatisfaction(data: SatisfactionData): number {
    // Check if we have any data at all
    const hasData = data.totalContracts > 0 || 
                   data.completedMaintenances > 0 || 
                   data.overdueMaintenances > 0 || 
                   data.pendingMaintenances > 0;
    
    if (!hasData) {
      return 0; // Return 0% when no data exists
    }
    
    const factors = this.calculateFactors(data);
    
    // Weighted calculation based on business importance
    const satisfaction = Math.round(
      factors.serviceExcellence * 0.35 +    // 35% - Most important: service delivery
      factors.reliability * 0.25 +         // 25% - Reliability and timeliness
      factors.clientRetention * 0.20 +     // 20% - Contract retention
      factors.responsiveness * 0.10 +      // 10% - Response quality
      factors.growthIndicator * 0.10       // 10% - Business growth indicator
    );
    
    // Apply business rules and constraints
    return this.applyBusinessRules(satisfaction, data);
  }
  
  /**
   * Calculate individual satisfaction factors
   */
  private static calculateFactors(data: SatisfactionData) {
    const totalMaintenances = data.completedMaintenances + data.overdueMaintenances + data.pendingMaintenances;
    
    return {
      serviceExcellence: this.calculateServiceExcellence(data, totalMaintenances),
      reliability: this.calculateReliability(data, totalMaintenances),
      clientRetention: this.calculateClientRetention(data),
      responsiveness: this.calculateResponsiveness(data),
      growthIndicator: this.calculateGrowthIndicator(data)
    };
  }
  
  /**
   * Service Excellence: Based on completion rate and quality metrics
   */
  private static calculateServiceExcellence(data: SatisfactionData, totalMaintenances: number): number {
    if (totalMaintenances === 0) return 0; // No score when no data
    
    // Base score from completion rate
    const completionRate = (data.completedMaintenances / totalMaintenances) * 100;
    
    // Quality bonuses
    let qualityBonus = 0;
    
    if (data.firstTimeFixRate && data.firstTimeFixRate > 80) {
      qualityBonus += 10; // Bonus for high first-time fix rate
    }
    
    if (data.escalatedIssues !== undefined && totalMaintenances > 0) {
      const escalationRate = (data.escalatedIssues / totalMaintenances) * 100;
      if (escalationRate < 5) {
        qualityBonus += 5; // Bonus for low escalation rate
      }
    }
    
    // Client feedback integration
    if (data.clientRatings && data.clientRatings.length > 0) {
      const averageRating = data.clientRatings.reduce((a, b) => a + b, 0) / data.clientRatings.length;
      qualityBonus += (averageRating - 3) * 5; // Convert 1-5 scale to bonus points
    }
    
    return Math.min(100, Math.max(20, completionRate + qualityBonus));
  }
  
  /**
   * Reliability: Based on timeliness and consistency
   */
  private static calculateReliability(data: SatisfactionData, totalMaintenances: number): number {
    if (totalMaintenances === 0) return 0; // No reliability score when no data
    
    // Timeliness score (penalty for overdue)
    const onTimeRate = totalMaintenances > 0 
      ? ((totalMaintenances - data.overdueMaintenances) / totalMaintenances) * 100 
      : 100;
    
    // Response time bonus
    let responseBonus = 0;
    if (data.averageResponseTime !== undefined) {
      if (data.averageResponseTime <= 2) {
        responseBonus = 15; // Excellent response time
      } else if (data.averageResponseTime <= 4) {
        responseBonus = 10; // Good response time
      } else if (data.averageResponseTime <= 8) {
        responseBonus = 5; // Acceptable response time
      }
      // No bonus for response time > 8 hours
    }
    
    return Math.min(100, Math.max(30, onTimeRate + responseBonus));
  }
  
  /**
   * Client Retention: Based on contract metrics
   */
  private static calculateClientRetention(data: SatisfactionData): number {
    if (data.totalContracts === 0) return 0; // No retention score when no contracts
    
    // Active contract ratio
    const activeRatio = (data.activeContracts / data.totalContracts) * 100;
    
    // Renewal success rate
    let renewalBonus = 0;
    if (data.contractRenewalRate !== undefined) {
      if (data.contractRenewalRate > 85) {
        renewalBonus = 20; // Excellent retention
      } else if (data.contractRenewalRate > 70) {
        renewalBonus = 15; // Good retention
      } else if (data.contractRenewalRate > 55) {
        renewalBonus = 10; // Fair retention
      }
    }
    
    // Cancellation penalty
    const cancellationPenalty = data.cancelledContracts > 0 
      ? Math.min(30, (data.cancelledContracts / data.totalContracts) * 100)
      : 0;
    
    return Math.min(100, Math.max(25, activeRatio + renewalBonus - cancellationPenalty));
  }
  
  /**
   * Responsiveness: Based on complaint handling and feedback
   */
  private static calculateResponsiveness(data: SatisfactionData): number {
    let baseScore = 0; // No responsiveness score when no data
    
    // Complaint resolution impact
    if (data.complaints !== undefined || data.compliments !== undefined) {
      const totalFeedback = (data.complaints || 0) + (data.compliments || 0);
      
      if (totalFeedback > 0) {
        const positiveRatio = (data.compliments || 0) / totalFeedback;
        baseScore = positiveRatio * 100;
      }
    }
    
    return Math.min(100, Math.max(40, baseScore));
  }
  
  /**
   * Growth Indicator: Based on new business acquisition
   */
  private static calculateGrowthIndicator(data: SatisfactionData): number {
    if (data.totalContracts === 0) return 0; // No growth indicator when no contracts
    
    // Growth rate calculation
    const growthRate = (data.newContractsThisMonth / Math.max(1, data.totalContracts)) * 100;
    
    // Convert growth rate to satisfaction score
    if (growthRate > 10) {
      return 100; // Exceptional growth
    } else if (growthRate > 5) {
      return 85; // Strong growth
    } else if (growthRate > 2) {
      return 75; // Steady growth
    } else if (growthRate > 0) {
      return 65; // Some growth
    } else {
      return 50; // No growth
    }
  }
  
  /**
   * Apply business rules and final adjustments
   */
  private static applyBusinessRules(baseSatisfaction: number, data: SatisfactionData): number {
    let finalScore = baseSatisfaction;
    
    // Critical business rules
    if (data.activeContracts === 0 && data.totalContracts > 0) {
      finalScore = Math.min(finalScore, 35); // Major penalty for no active contracts
    }
    
    if (data.overdueMaintenances > data.completedMaintenances && data.overdueMaintenances > 0) {
      finalScore = Math.max(25, finalScore - 25); // Penalty for poor maintenance performance
    }
    
    if (data.overduePendingMaintenances && data.overduePendingMaintenances > 5) {
      finalScore = Math.max(30, finalScore - 15); // Payment issues impact satisfaction
    }
    
    // Excellence bonuses
    const totalMaintenances = data.completedMaintenances + data.overdueMaintenances + data.pendingMaintenances;
    if (totalMaintenances > 20 && data.overdueMaintenances === 0) {
      finalScore = Math.min(100, finalScore + 5); // Bonus for perfect track record
    }
    
    // Ensure reasonable bounds
    return Math.max(20, Math.min(100, Math.round(finalScore)));
  }
  
  /**
   * Get satisfaction rating with context
   */
  static getSatisfactionRating(score: number): {
    score: number;
    rating: string;
    description: string;
    color: string;
  } {
    if (score >= 90) {
      return {
        score,
        rating: "Excelente",
        description: "Clientes altamente satisfeitos com serviços excepcionais",
        color: "#10b981"
      };
    } else if (score >= 80) {
      return {
        score,
        rating: "Muito Bom",
        description: "Clientes satisfeitos com boa qualidade de serviço",
        color: "#059669"
      };
    } else if (score >= 70) {
      return {
        score,
        rating: "Bom",
        description: "Satisfação adequada com oportunidades de melhoria",
        color: "#f59e0b"
      };
    } else if (score >= 60) {
      return {
        score,
        rating: "Regular",
        description: "Satisfação moderada, necessita atenção",
        color: "#d97706"
      };
    } else if (score >= 40) {
      return {
        score,
        rating: "Baixo",
        description: "Satisfação insatisfatória, ação imediata necessária",
        color: "#dc2626"
      };
    } else {
      return {
        score,
        rating: "Crítico",
        description: "Situação crítica, intervenção urgente requerida",
        color: "#991b1b"
      };
    }
  }
}