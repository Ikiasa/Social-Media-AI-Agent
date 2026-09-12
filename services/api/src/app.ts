import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import healthRoutes from './routes/healthRoutes';
import brandRoutes from './routes/brandRoutes';
import contentRoutes from './routes/contentRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import agentRoutes from './routes/agentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import calendarRoutes from './routes/calendarRoutes';
import oauthRoutes from './routes/oauthRoutes';
import crewAiRoutes from './routes/crewAiRoutes';
import instagramProxyRoutes from './routes/instagramProxyRoutes';
import queueRoutes from './routes/queueRoutes';
import instagramAuditRoutes from './routes/instagramAuditRoutes';
import approvalRoutes from './routes/approvalRoutes';
import campaignRoutes from './routes/campaignRoutes';
import competitorTrendRoutes from './routes/competitorTrendRoutes';
import unifiedInboxRoutes from './routes/unifiedInboxRoutes';
import creativeRoutes from './routes/creativeRoutes';
import socialListeningRoutes from './routes/socialListeningRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

app.use(helmet({ xssFilter: true, noSniff: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Dev-User-Id, X-Dev-Workspace-Id, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '1kb' }));
app.use(cookieParser());


app.use('/api', healthRoutes);
app.use('/api', brandRoutes);
app.use('/api', contentRoutes);
app.use('/api', knowledgeRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', calendarRoutes);
app.use('/api', oauthRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/crewai', crewAiRoutes);
app.use('/api/v1/instagram-proxy', instagramProxyRoutes);
app.use('/api/v1/queues', queueRoutes);
app.use('/api/v1/instagram', instagramAuditRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/competitor-radar', competitorTrendRoutes);
app.use('/api/v1/inbox', unifiedInboxRoutes);
app.use('/api/v1/creative', creativeRoutes);
app.use('/api/v1/social-data', socialListeningRoutes);

app.use(errorHandler);

export default app;
