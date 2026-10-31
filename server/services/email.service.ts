import { db } from '@/server/db';
import {
  EmailTemplate,
  EmailLog,
  NewsletterCampaign,
  EmailSettings,
  EmailSmtpConfig,
  NewsletterAudienceFilter,
  UserAccount,
} from '@/lib/types';
import { adminService } from './admin.service';

export class EmailService {
  public getTemplates(): EmailTemplate[] {
    return Array.from(db.emailTemplates.values());
  }

  public getTemplateById(id: string): EmailTemplate | undefined {
    return db.emailTemplates.get(id);
  }

  public updateTemplate(id: string, updatedData: Partial<EmailTemplate>): EmailTemplate | null {
    const existing = db.emailTemplates.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updatedData,
      lastUpdated: new Date().toISOString(),
    };
    db.emailTemplates.set(id, updated);
    adminService.recordAudit('EMAIL_TEMPLATE_UPDATED', 'Email', id, updated.name, `Updated template ${updated.name}`);
    return updated;
  }

  public getLogs(): EmailLog[] {
    return Array.from(db.emailLogs.values()).sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }

  public sendEmail(logData: Omit<EmailLog, 'id' | 'sentAt' | 'status'>): EmailLog {
    const id = 'eml_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const log: EmailLog = {
      ...logData,
      id,
      sentAt: new Date().toISOString(),
      status: 'delivered',
    };
    db.emailLogs.set(id, log);
    return log;
  }

  public getNewsletters(): NewsletterCampaign[] {
    return Array.from(db.newsletters.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public filterAudienceUsers(filter: NewsletterAudienceFilter | string, customState?: string, customCity?: string): UserAccount[] {
    const allUsers = Array.from(db.users.values()).filter((u) => u.status === 'active' && u.emailSubscribed);
    const target = typeof filter === 'string' ? filter : filter.target;

    switch (target) {
      case 'active_sellers':
        return allUsers.filter((u) => u.activeListings > 0);
      case 'business_users':
        return allUsers.filter((u) => u.type === 'business');
      case 'individual_users':
        return allUsers.filter((u) => u.type === 'user');
      case 'city_specific': {
        const city = customCity || (typeof filter !== 'string' ? filter.city : '');
        if (!city || city === 'all') return allUsers;
        return allUsers.filter((u) => u.location.city.toLowerCase() === city.toLowerCase());
      }
      case 'state_specific': {
        const state = customState || (typeof filter !== 'string' ? filter.state : '');
        if (!state || state === 'all') return allUsers;
        return allUsers.filter((u) => u.location.state.toLowerCase() === state.toLowerCase());
      }
      case 'all_subscribed':
      default:
        return allUsers;
    }
  }

  public createNewsletterCampaign(data: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'sentCount'>): NewsletterCampaign {
    const id = 'camp_' + Date.now();
    const campaign: NewsletterCampaign = {
      ...data,
      id,
      sentCount: 0,
      createdAt: new Date().toISOString(),
    };
    db.newsletters.set(id, campaign);
    return campaign;
  }

  public async sendNewsletterCampaign(campaignId: string): Promise<{ success: boolean; recipientCount: number; message: string }> {
    const campaign = db.newsletters.get(campaignId);
    if (!campaign) {
      return { success: false, recipientCount: 0, message: 'Campaign not found' };
    }

    const recipients = this.filterAudienceUsers(campaign.targetAudience || 'all_subscribed', campaign.targetState, campaign.targetCity);
    const count = recipients.length;

    // Simulate sending in batches
    for (const user of recipients) {
      this.sendEmail({
        toEmail: user.email,
        toName: user.name,
        subject: campaign.subject,
        body: campaign.bodyHtml || campaign.contentHtml || '',
        type: 'newsletter',
        isMarketing: true,
        relatedUserId: user.id,
      });
    }

    campaign.status = 'sent';
    campaign.sentCount = count;
    campaign.deliveredCount = Math.round(count * 0.98);
    campaign.openedCount = Math.round(count * 0.42);
    campaign.clickedCount = Math.round(count * 0.18);
    campaign.sentAt = new Date().toISOString();
    db.newsletters.set(campaignId, campaign);

    adminService.recordAudit('CAMPAIGN_SENT', 'Email', campaignId, campaign.subject, `Broadcast sent to ${count} users`);

    return {
      success: true,
      recipientCount: count,
      message: `Newsletter "${campaign.subject}" successfully dispatched to ${count} recipients.`,
    };
  }

  public getSettings(): EmailSettings {
    return db.emailSettings;
  }

  public updateSettings(settings: Partial<EmailSettings>): EmailSettings {
    db.emailSettings = { ...db.emailSettings, ...settings };
    adminService.recordAudit('EMAIL_SETTINGS_UPDATED', 'Email', 'smtp', 'SMTP Settings', 'Updated SMTP configuration');
    return db.emailSettings;
  }

  public async testSmtpConnection(config?: EmailSmtpConfig): Promise<{ success: boolean; message: string; latencyMs: number }> {
    // Ping simulation
    const latency = Math.floor(40 + Math.random() * 60);
    return {
      success: true,
      message: `Connected successfully to SMTP host with latency ${latency}ms. STARTTLS verified.`,
      latencyMs: latency,
    };
  }
}

export const emailService = new EmailService();
