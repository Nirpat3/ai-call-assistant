import { WebClient } from '@slack/web-api';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export interface IntegrationConfig {
  id: string;
  name: string;
  status: 'connected' | 'available' | 'configured' | 'error';
  credentials: Record<string, string>;
  settings: Record<string, any>;
  lastSync?: Date;
  errorMessage?: string;
}

export class IntegrationManager {
  private integrations: Map<string, IntegrationConfig> = new Map();

  constructor() {
    this.loadIntegrations();
  }

  private loadIntegrations() {
    // Initialize with default configurations
    const defaultIntegrations = [
      'slack', 'teams', 'zoom', 'google-workspace', 
      'salesforce', 'hubspot', 'calendly', 'zapier'
    ];

    defaultIntegrations.forEach(id => {
      this.integrations.set(id, {
        id,
        name: this.getIntegrationName(id),
        status: 'available',
        credentials: {},
        settings: {}
      });
    });
  }

  private getIntegrationName(id: string): string {
    const names: Record<string, string> = {
      'slack': 'Slack',
      'teams': 'Microsoft Teams',
      'zoom': 'Zoom',
      'google-workspace': 'Google Workspace',
      'salesforce': 'Salesforce',
      'hubspot': 'HubSpot',
      'calendly': 'Calendly',
      'zapier': 'Zapier'
    };
    return names[id] || id;
  }

  async connectIntegration(integrationId: string, credentials: Record<string, string>): Promise<boolean> {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Validate credentials based on integration type
      const isValid = await this.validateCredentials(integrationId, credentials);
      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      // Update integration status
      integration.status = 'connected';
      integration.credentials = credentials;
      integration.lastSync = new Date();
      integration.errorMessage = undefined;

      this.integrations.set(integrationId, integration);
      return true;
    } catch (error) {
      const integration = this.integrations.get(integrationId);
      if (integration) {
        integration.status = 'error';
        integration.errorMessage = error instanceof Error ? error.message : 'Connection failed';
        this.integrations.set(integrationId, integration);
      }
      throw error;
    }
  }

  async disconnectIntegration(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    integration.status = 'available';
    integration.credentials = {};
    integration.settings = {};
    integration.lastSync = undefined;
    integration.errorMessage = undefined;

    this.integrations.set(integrationId, integration);
    return true;
  }

  async testIntegration(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration || integration.status !== 'connected') {
      throw new Error('Integration not connected');
    }

    try {
      const testResult = await this.performIntegrationTest(integrationId, integration);
      if (testResult) {
        integration.lastSync = new Date();
        integration.errorMessage = undefined;
        this.integrations.set(integrationId, integration);
      }
      return testResult;
    } catch (error) {
      integration.status = 'error';
      integration.errorMessage = error instanceof Error ? error.message : 'Test failed';
      this.integrations.set(integrationId, integration);
      throw error;
    }
  }

  private async validateCredentials(integrationId: string, credentials: Record<string, string>): Promise<boolean> {
    switch (integrationId) {
      case 'slack':
        return this.validateSlackCredentials(credentials);
      case 'teams':
        return this.validateTeamsCredentials(credentials);
      case 'zoom':
        return this.validateZoomCredentials(credentials);
      case 'google-workspace':
        return this.validateGoogleCredentials(credentials);
      case 'salesforce':
        return this.validateSalesforceCredentials(credentials);
      case 'hubspot':
        return this.validateHubSpotCredentials(credentials);
      case 'calendly':
        return this.validateCalendlyCredentials(credentials);
      case 'zapier':
        return this.validateZapierCredentials(credentials);
      default:
        return false;
    }
  }

  private async validateSlackCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const { SLACK_BOT_TOKEN, SLACK_CHANNEL_ID } = credentials;
      if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
        throw new Error('Missing required credentials');
      }

      const slack = new WebClient(SLACK_BOT_TOKEN);
      await slack.auth.test();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async validateTeamsCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const { TEAMS_WEBHOOK_URL } = credentials;
      if (!TEAMS_WEBHOOK_URL) {
        return false;
      }
      // Test webhook URL format
      new URL(TEAMS_WEBHOOK_URL);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async validateZoomCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const { ZOOM_API_KEY, ZOOM_API_SECRET } = credentials;
      if (!ZOOM_API_KEY || !ZOOM_API_SECRET) {
        return false;
      }
      // Basic format validation
      return ZOOM_API_KEY.length > 0 && ZOOM_API_SECRET.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async validateGoogleCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const { GOOGLE_SERVICE_ACCOUNT_KEY } = credentials;
      if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
        return false;
      }
      // Validate JSON format
      JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async validateSalesforceCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const { SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET } = credentials;
      if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  private async validateHubSpotCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const { HUBSPOT_API_KEY } = credentials;
      if (!HUBSPOT_API_KEY) {
        return false;
      }
      return HUBSPOT_API_KEY.startsWith('pat-') || HUBSPOT_API_KEY.length > 30;
    } catch (error) {
      return false;
    }
  }

  private async validateCalendlyCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const { CALENDLY_API_TOKEN } = credentials;
      if (!CALENDLY_API_TOKEN) {
        return false;
      }
      return CALENDLY_API_TOKEN.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async validateZapierCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const { ZAPIER_WEBHOOK_URL } = credentials;
      if (!ZAPIER_WEBHOOK_URL) {
        return false;
      }
      new URL(ZAPIER_WEBHOOK_URL);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async performIntegrationTest(integrationId: string, integration: IntegrationConfig): Promise<boolean> {
    switch (integrationId) {
      case 'slack':
        return this.testSlackIntegration(integration);
      case 'teams':
        return this.testTeamsIntegration(integration);
      case 'zoom':
        return this.testZoomIntegration(integration);
      case 'google-workspace':
        return this.testGoogleIntegration(integration);
      case 'salesforce':
        return this.testSalesforceIntegration(integration);
      case 'hubspot':
        return this.testHubSpotIntegration(integration);
      case 'calendly':
        return this.testCalendlyIntegration(integration);
      case 'zapier':
        return this.testZapierIntegration(integration);
      default:
        return false;
    }
  }

  private async testSlackIntegration(integration: IntegrationConfig): Promise<boolean> {
    try {
      const slack = new WebClient(integration.credentials.SLACK_BOT_TOKEN);
      await slack.chat.postMessage({
        channel: integration.credentials.SLACK_CHANNEL_ID,
        text: 'Test message from AI Call Assistant - Integration working correctly!'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testTeamsIntegration(integration: IntegrationConfig): Promise<boolean> {
    try {
      const webhookUrl = integration.credentials.TEAMS_WEBHOOK_URL;
      await axios.post(webhookUrl, {
        '@type': 'MessageCard',
        'summary': 'Test Message',
        'text': 'Test message from AI Call Assistant - Integration working correctly!'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testZoomIntegration(integration: IntegrationConfig): Promise<boolean> {
    try {
      // Generate JWT token for testing
      const token = jwt.sign(
        { iss: integration.credentials.ZOOM_API_KEY, exp: Math.floor(Date.now() / 1000) + 3600 },
        integration.credentials.ZOOM_API_SECRET
      );
      
      const response = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async testGoogleIntegration(integration: IntegrationConfig): Promise<boolean> {
    // This would require Google API client setup
    // For now, return true if credentials are valid JSON
    try {
      JSON.parse(integration.credentials.GOOGLE_SERVICE_ACCOUNT_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testSalesforceIntegration(integration: IntegrationConfig): Promise<boolean> {
    try {
      // Test Salesforce connection
      const authUrl = 'https://login.salesforce.com/services/oauth2/token';
      const response = await axios.post(authUrl, new URLSearchParams({
        grant_type: 'password',
        client_id: integration.credentials.SALESFORCE_CLIENT_ID,
        client_secret: integration.credentials.SALESFORCE_CLIENT_SECRET,
        username: integration.credentials.SALESFORCE_USERNAME,
        password: integration.credentials.SALESFORCE_PASSWORD
      }));
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async testHubSpotIntegration(integration: IntegrationConfig): Promise<boolean> {
    try {
      const response = await axios.get('https://api.hubapi.com/contacts/v1/lists/all/contacts/all', {
        headers: { Authorization: `Bearer ${integration.credentials.HUBSPOT_API_KEY}` },
        params: { count: 1 }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async testCalendlyIntegration(integration: IntegrationConfig): Promise<boolean> {
    try {
      const response = await axios.get('https://api.calendly.com/users/me', {
        headers: { Authorization: `Bearer ${integration.credentials.CALENDLY_API_TOKEN}` }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async testZapierIntegration(integration: IntegrationConfig): Promise<boolean> {
    try {
      await axios.post(integration.credentials.ZAPIER_WEBHOOK_URL, {
        test: true,
        message: 'Test from AI Call Assistant'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  getIntegrationStatus(integrationId: string): IntegrationConfig | undefined {
    return this.integrations.get(integrationId);
  }

  getAllIntegrationStatuses(): Record<string, string> {
    const statuses: Record<string, string> = {};
    this.integrations.forEach((integration, id) => {
      statuses[id] = integration.status;
    });
    return statuses;
  }

  // Integration-specific notification methods
  async sendSlackNotification(message: string, channel?: string): Promise<boolean> {
    const slackIntegration = this.integrations.get('slack');
    if (!slackIntegration || slackIntegration.status !== 'connected') {
      return false;
    }

    try {
      const slack = new WebClient(slackIntegration.credentials.SLACK_BOT_TOKEN);
      await slack.chat.postMessage({
        channel: channel || slackIntegration.credentials.SLACK_CHANNEL_ID,
        text: message
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendTeamsNotification(message: string): Promise<boolean> {
    const teamsIntegration = this.integrations.get('teams');
    if (!teamsIntegration || teamsIntegration.status !== 'connected') {
      return false;
    }

    try {
      await axios.post(teamsIntegration.credentials.TEAMS_WEBHOOK_URL, {
        '@type': 'MessageCard',
        'summary': 'AI Call Assistant Notification',
        'text': message
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendZapierWebhook(data: any): Promise<boolean> {
    const zapierIntegration = this.integrations.get('zapier');
    if (!zapierIntegration || zapierIntegration.status !== 'connected') {
      return false;
    }

    try {
      await axios.post(zapierIntegration.credentials.ZAPIER_WEBHOOK_URL, data);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const integrationManager = new IntegrationManager();