import express from 'express';
import { ApiError } from '../middleware/apiError.js';
import { z, validateBody } from '../middleware/validate.js';
import { buildMetadata, sendDataWithMeta } from '../utils/responseMetadata.js';
import { getPool } from '../db/config.js';
import {
  ARTIFACT_BUCKETS,
  resolveActorContext,
  getLatestArtifact,
  putArtifactVersion,
} from '../utils/workspaceArtifactsStore.js';

const router = express.Router();

const generateReportBodySchema = z.object({
  format: z.string().min(1),
  title: z.string().min(1),
  portfolioData: z.unknown().optional(),
  countryRisks: z.unknown().optional(),
  includeCharts: z.boolean().optional(),
});

const emailReportBodySchema = z.object({
  recipientEmail: z.string().email(),
  subject: z.string().min(1),
  reportData: z.unknown().optional(),
});

const scheduleReportBodySchema = z.object({
  title: z.string().min(1),
  format: z.string().min(1),
  frequency: z.string().min(1),
  recipientEmail: z.string().email(),
});

async function getSchedulesHistoryState(req) {
  try {
    const pool = await getPool();
    if (!pool) {
      return null;
    }

    const context = resolveActorContext(req);
    const latest = await getLatestArtifact(pool, {
      userId: context.userId,
      workspaceId: context.workspaceId,
      artifactType: ARTIFACT_BUCKETS.schedulesHistory,
      artifactKey: 'default',
    });

    return {
      pool,
      context,
      latest,
      state: latest?.payload && typeof latest.payload === 'object'
        ? latest.payload
        : { schedules: [], history: [] },
    };
  } catch {
    return null;
  }
}

async function persistSchedulesHistory(req, state, latestVersion) {
  const workspaceState = await getSchedulesHistoryState(req);
  if (!workspaceState) {
    return null;
  }

  return putArtifactVersion(workspaceState.pool, {
    context: workspaceState.context,
    artifactType: ARTIFACT_BUCKETS.schedulesHistory,
    artifactKey: 'default',
    payload: state,
    expectedVersion: latestVersion,
    traceId: req.traceId,
  });
}

/**
 * POST /api/reports/generate
 * Generate and download a report
 */
router.post('/generate', validateBody(generateReportBodySchema), async (req, res, next) => {
  try {
    const { format, title, includeCharts } = req.body;

    const timestamp = new Date().toISOString();
    const filename = `${title.replace(/\s+/g, '_')}_${timestamp.split('T')[0]}`;

    // Prepare report metadata
    const reportMetadata = {
      title,
      generatedAt: timestamp,
      format,
      includeCharts: includeCharts || false,
    };

    const workspaceState = await getSchedulesHistoryState(req);
    if (workspaceState) {
      const currentState = {
        schedules: Array.isArray(workspaceState.state.schedules) ? workspaceState.state.schedules : [],
        history: Array.isArray(workspaceState.state.history) ? workspaceState.state.history : [],
      };

      currentState.history = [
        {
          id: `report-${Date.now()}`,
          title,
          format,
          generatedAt: timestamp,
          status: 'generated',
          includeCharts: Boolean(includeCharts),
        },
        ...currentState.history,
      ].slice(0, 200);

      await persistSchedulesHistory(req, currentState, workspaceState.latest?.version ?? 0);
    }

    sendDataWithMeta(
      res,
      {
        success: true,
        message: 'Report generation initiated',
        report: {
          filename,
          format,
          metadata: reportMetadata,
        },
      },
      buildMetadata({
        source: 'reporting.engine',
        sourceType: 'generated',
        freshness: { staleAfterSeconds: 300 },
        reliability: { score: 0.88, methodologyVersion: 'report-builder-v1' },
      })
    );
  } catch {
    next(new ApiError(500, 'REPORT_GENERATE_FAILED', 'Failed to generate report'));
  }
});

/**
 * POST /api/reports/email
 * Send report via email
 */
router.post('/email', validateBody(emailReportBodySchema), async (req, res, next) => {
  try {
    const { recipientEmail } = req.body;

    // In production, integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, just simulate the request
    const timestamp = new Date().toISOString();

    const workspaceState = await getSchedulesHistoryState(req);
    if (workspaceState) {
      const currentState = {
        schedules: Array.isArray(workspaceState.state.schedules) ? workspaceState.state.schedules : [],
        history: Array.isArray(workspaceState.state.history) ? workspaceState.state.history : [],
      };

      currentState.history = [
        {
          id: `report-email-${Date.now()}`,
          title: req.body?.subject || 'Email Report',
          format: 'email',
          generatedAt: timestamp,
          status: 'emailed',
          recipientEmail,
        },
        ...currentState.history,
      ].slice(0, 200);

      await persistSchedulesHistory(req, currentState, workspaceState.latest?.version ?? 0);
    }

    sendDataWithMeta(
      res,
      {
        success: true,
        message: 'Report email queued for delivery',
        recipient: recipientEmail,
        timestamp,
      },
      buildMetadata({
        source: 'reporting.email-queue',
        sourceType: 'generated',
        freshness: { staleAfterSeconds: 300 },
        reliability: { score: 0.86, methodologyVersion: 'report-email-v1' },
      })
    );
  } catch {
    next(new ApiError(500, 'REPORT_EMAIL_FAILED', 'Failed to send report email'));
  }
});

/**
 * GET /api/reports/templates
 * Get available report templates
 */
router.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'portfolio-summary',
      name: 'Portfolio Summary',
      description: 'Overview of portfolio holdings and risk metrics',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'country-analysis',
      name: 'Country Risk Analysis',
      description: 'Detailed country-by-country risk assessment',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'trend-analysis',
      name: 'Historical Trends',
      description: 'Portfolio and country risk trends over time',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Report',
      description: 'Full analysis with charts, tables, and summary',
      formats: ['pdf'],
    },
  ];

  sendDataWithMeta(
    res,
    {
      success: true,
      templates,
    },
    buildMetadata({
      source: 'reporting.templates',
      sourceType: 'generated',
      freshness: { staleAfterSeconds: 86400 },
      reliability: { score: 0.9, methodologyVersion: 'report-template-v1' },
    })
  );
});

/**
 * POST /api/reports/schedule
 * Schedule a report for regular delivery
 */
router.post('/schedule', validateBody(scheduleReportBodySchema), async (req, res, next) => {
  try {
    const { title, format, frequency, recipientEmail } = req.body;
    const schedule = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      format,
      frequency,
      recipientEmail,
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    const workspaceState = await getSchedulesHistoryState(req);
    if (workspaceState) {
      const currentState = {
        schedules: Array.isArray(workspaceState.state.schedules) ? workspaceState.state.schedules : [],
        history: Array.isArray(workspaceState.state.history) ? workspaceState.state.history : [],
      };

      currentState.schedules = [schedule, ...currentState.schedules].slice(0, 100);
      currentState.history = [
        {
          id: `report-schedule-${Date.now()}`,
          title,
          format,
          generatedAt: schedule.createdAt,
          status: 'scheduled',
          recipientEmail,
          frequency,
        },
        ...currentState.history,
      ].slice(0, 200);

      await persistSchedulesHistory(req, currentState, workspaceState.latest?.version ?? 0);
    }

    sendDataWithMeta(
      res,
      {
        success: true,
        message: 'Report schedule created',
        schedule,
      },
      buildMetadata({
        source: 'reporting.scheduler',
        sourceType: 'generated',
        freshness: { staleAfterSeconds: 300 },
        reliability: { score: 0.84, methodologyVersion: 'report-schedule-v1' },
      })
    );
  } catch {
    next(new ApiError(500, 'REPORT_SCHEDULE_FAILED', 'Failed to schedule report'));
  }
});

/**
 * GET /api/reports/history
 * Get report generation history
 */
router.get('/history', async (req, res, next) => {
  try {
    const workspaceState = await getSchedulesHistoryState(req);

    const reports = workspaceState
      ? (Array.isArray(workspaceState.state.history) ? workspaceState.state.history : [])
      : [];

    sendDataWithMeta(
      res,
      {
        success: true,
        reports,
      },
      buildMetadata({
        source: 'reporting.history',
        sourceType: workspaceState ? 'database' : 'fallback',
        fallback: {
          used: !workspaceState,
          reason: workspaceState ? null : 'database_unavailable',
        },
        freshness: { staleAfterSeconds: 3600, isStale: !workspaceState },
        reliability: { score: workspaceState ? 0.88 : 0.5, methodologyVersion: 'report-history-v2' },
      })
    );
  } catch (error) {
    next(new ApiError(500, 'REPORT_HISTORY_FETCH_FAILED', 'Failed to fetch report history', error?.message));
  }
});

export default router;
