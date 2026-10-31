import { db } from '@/server/db';
import { ReportItem, ModerationRule } from '@/lib/types';
import { adminService } from './admin.service';

export class ModerationService {
  public getReports(statusFilter?: string): ReportItem[] {
    const all = Array.from(db.reports.values());
    if (statusFilter && statusFilter !== 'all') {
      return all.filter((r) => r.status === statusFilter);
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public submitReport(data: {
    type: 'listing' | 'user' | 'message';
    targetId: string;
    targetTitle: string;
    reportedBy: string;
    reportedByName: string;
    reason: 'spam' | 'prohibited_item' | 'fraud_scam' | 'offensive' | 'duplicate' | 'wrong_category';
    notes: string;
  }): ReportItem {
    const id = 'rep_' + Date.now();
    const report: ReportItem = {
      id,
      type: data.type,
      targetId: data.targetId,
      targetTitle: data.targetTitle,
      reportedBy: data.reportedBy,
      reportedByName: data.reportedByName,
      reason: data.reason,
      notes: data.notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.reports.set(id, report);
    return report;
  }

  public actionReport(
    reportId: string,
    actionNote: string,
    actionType: 'actioned' | 'dismissed'
  ): boolean {
    const report = db.reports.get(reportId);
    if (!report) return false;

    report.status = actionType;
    report.actionTaken = actionNote;
    db.reports.set(reportId, report);

    if (actionType === 'actioned') {
      if (report.type === 'listing') {
        const listing = db.listings.get(report.targetId);
        if (listing) {
          listing.status = 'rejected';
          listing.rejectionReason = `Actioned report: ${report.reason} - ${actionNote}`;
          db.listings.set(report.targetId, listing);
        }
      }
    }

    adminService.recordAudit(
      actionType === 'actioned' ? 'REPORT_ACTIONED' : 'REPORT_DISMISSED',
      'Moderation',
      reportId,
      report.targetTitle,
      `Action: ${actionType}. Note: ${actionNote}`
    );

    return true;
  }

  // Rules
  public getRules(): ModerationRule[] {
    return Array.from(db.rules.values());
  }

  public addRule(ruleData: Omit<ModerationRule, 'id'>): ModerationRule {
    const id = 'rule_' + Date.now();
    const rule: ModerationRule = {
      ...ruleData,
      id,
    };
    db.rules.set(id, rule);
    adminService.recordAudit('RULE_CREATED', 'Moderation', id, rule.title, `Added moderation rule ${rule.title}`);
    return rule;
  }

  public toggleRule(id: string): boolean {
    const rule = db.rules.get(id);
    if (!rule) return false;
    rule.isActive = !rule.isActive;
    db.rules.set(id, rule);
    return rule.isActive;
  }
}

export const moderationService = new ModerationService();
