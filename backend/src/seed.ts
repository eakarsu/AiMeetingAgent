import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.agendaItem.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.meetingNote.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.meetingTemplate.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.analytics.deleteMany();
  await prisma.user.deleteMany();

  console.log('📝 Creating users...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@aimeetingagent.com',
      password: hashedPassword,
      name: 'Demo User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      role: 'admin'
    }
  });

  // Create additional users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john@company.com',
        password: hashedPassword,
        name: 'John Smith',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john'
      }
    }),
    prisma.user.create({
      data: {
        email: 'sarah@company.com',
        password: hashedPassword,
        name: 'Sarah Johnson',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah'
      }
    }),
    prisma.user.create({
      data: {
        email: 'mike@company.com',
        password: hashedPassword,
        name: 'Mike Wilson',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike'
      }
    })
  ]);

  console.log('📅 Creating meetings (15+ items)...');

  const now = new Date();
  const meetings = await Promise.all([
    // Past meetings
    prisma.meeting.create({
      data: {
        title: 'Q4 Planning Session',
        description: 'Quarterly planning meeting to discuss goals and OKRs',
        startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        status: 'completed',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Product Review Meeting',
        description: 'Review of new product features and roadmap',
        startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
        status: 'completed',
        meetingLink: 'https://zoom.us/j/123456789',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Engineering Sync',
        description: 'Weekly engineering team sync',
        startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'completed',
        meetingLink: 'https://teams.microsoft.com/l/meetup-join/123',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Design Review: Homepage Redesign',
        description: 'Review design mockups for homepage redesign project',
        startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: 'completed',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Budget Review Meeting',
        description: 'Annual budget review with finance team',
        startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
        status: 'completed',
        userId: demoUser.id
      }
    }),
    // Today's meetings
    prisma.meeting.create({
      data: {
        title: 'Daily Standup',
        description: 'Daily team standup meeting',
        startTime: new Date(now.setHours(9, 0, 0, 0)),
        endTime: new Date(now.setHours(9, 15, 0, 0)),
        status: 'completed',
        meetingLink: 'https://meet.google.com/daily-standup',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Client Presentation: ABC Corp',
        description: 'Product demo for ABC Corporation',
        startTime: new Date(now.setHours(14, 0, 0, 0)),
        endTime: new Date(now.setHours(15, 0, 0, 0)),
        status: 'scheduled',
        meetingLink: 'https://zoom.us/j/client-abc',
        userId: demoUser.id
      }
    }),
    // Future meetings
    prisma.meeting.create({
      data: {
        title: 'Sprint Retrospective',
        description: 'End of sprint retrospective meeting',
        startTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'scheduled',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Investor Update Call',
        description: 'Monthly investor update and Q&A',
        startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: 'scheduled',
        meetingLink: 'https://zoom.us/j/investor-call',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Technical Architecture Review',
        description: 'Review of system architecture for new microservices',
        startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        status: 'scheduled',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Marketing Strategy Session',
        description: 'Q1 marketing campaign planning',
        startTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
        status: 'scheduled',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'HR Policy Review',
        description: 'Review and update of company HR policies',
        startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'scheduled',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Customer Success Review',
        description: 'Monthly customer success metrics review',
        startTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: 'scheduled',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'All Hands Meeting',
        description: 'Company-wide all hands meeting',
        startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'scheduled',
        meetingLink: 'https://zoom.us/j/all-hands',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Security Audit Kickoff',
        description: 'Kickoff meeting for annual security audit',
        startTime: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
        status: 'scheduled',
        userId: demoUser.id
      }
    }),
    prisma.meeting.create({
      data: {
        title: 'Partnership Discussion: XYZ Inc',
        description: 'Strategic partnership discussion with XYZ Inc',
        startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'scheduled',
        meetingLink: 'https://meet.google.com/xyz-partnership',
        userId: demoUser.id
      }
    })
  ]);

  console.log('👥 Creating participants (15+ items)...');

  const participantData = [
    { name: 'Alice Brown', email: 'alice@company.com', role: 'host' },
    { name: 'Bob Chen', email: 'bob@company.com', role: 'presenter' },
    { name: 'Carol Davis', email: 'carol@company.com', role: 'attendee' },
    { name: 'David Lee', email: 'david@company.com', role: 'attendee' },
    { name: 'Emma Wilson', email: 'emma@company.com', role: 'attendee' },
    { name: 'Frank Garcia', email: 'frank@company.com', role: 'attendee' },
    { name: 'Grace Kim', email: 'grace@company.com', role: 'presenter' },
    { name: 'Henry Martinez', email: 'henry@company.com', role: 'attendee' },
    { name: 'Ivy Thompson', email: 'ivy@company.com', role: 'attendee' },
    { name: 'Jack Anderson', email: 'jack@company.com', role: 'attendee' },
    { name: 'Katie White', email: 'katie@company.com', role: 'attendee' },
    { name: 'Leo Harris', email: 'leo@company.com', role: 'presenter' },
    { name: 'Mia Clark', email: 'mia@company.com', role: 'attendee' },
    { name: 'Noah Lewis', email: 'noah@company.com', role: 'attendee' },
    { name: 'Olivia Young', email: 'olivia@company.com', role: 'attendee' },
    { name: 'Peter Hall', email: 'peter@company.com', role: 'attendee' }
  ];

  for (const meeting of meetings.slice(0, 8)) {
    const shuffled = [...participantData].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.floor(Math.random() * 5) + 3);

    for (const p of selected) {
      await prisma.participant.create({
        data: {
          ...p,
          meetingId: meeting.id,
          status: meeting.status === 'completed' ? 'accepted' : ['pending', 'accepted', 'tentative'][Math.floor(Math.random() * 3)]
        }
      });
    }
  }

  console.log('✅ Creating action items (15+ items)...');

  const actionItems = [
    { title: 'Update project timeline', description: 'Revise project timeline based on new requirements', priority: 'high', status: 'pending' },
    { title: 'Review code PR #123', description: 'Review and approve pull request for new feature', priority: 'high', status: 'in_progress' },
    { title: 'Schedule client meeting', description: 'Set up follow-up meeting with ABC Corp', priority: 'medium', status: 'completed' },
    { title: 'Draft Q4 report', description: 'Prepare quarterly performance report', priority: 'high', status: 'pending' },
    { title: 'Update documentation', description: 'Update API documentation with new endpoints', priority: 'medium', status: 'pending' },
    { title: 'Fix login bug', description: 'Investigate and fix authentication issue', priority: 'urgent', status: 'in_progress' },
    { title: 'Design new dashboard', description: 'Create mockups for analytics dashboard', priority: 'medium', status: 'pending' },
    { title: 'Onboard new team member', description: 'Prepare onboarding materials and schedule sessions', priority: 'medium', status: 'completed' },
    { title: 'Review security policies', description: 'Annual review of security policies', priority: 'high', status: 'pending' },
    { title: 'Prepare investor deck', description: 'Update investor presentation with latest metrics', priority: 'high', status: 'in_progress' },
    { title: 'Migrate database', description: 'Plan and execute database migration to new server', priority: 'high', status: 'pending' },
    { title: 'Set up CI/CD pipeline', description: 'Configure automated deployment pipeline', priority: 'medium', status: 'completed' },
    { title: 'Customer feedback analysis', description: 'Analyze recent customer feedback and create action plan', priority: 'medium', status: 'pending' },
    { title: 'Performance optimization', description: 'Optimize slow database queries', priority: 'high', status: 'in_progress' },
    { title: 'Create marketing content', description: 'Write blog posts for product launch', priority: 'medium', status: 'pending' },
    { title: 'Update privacy policy', description: 'Review and update privacy policy for GDPR compliance', priority: 'high', status: 'pending' }
  ];

  for (let i = 0; i < actionItems.length; i++) {
    const item = actionItems[i];
    await prisma.actionItem.create({
      data: {
        ...item,
        meetingId: meetings[i % meetings.length].id,
        assigneeId: i % 2 === 0 ? demoUser.id : users[i % users.length].id,
        dueDate: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000)
      }
    });
  }

  console.log('📝 Creating meeting notes (15+ items)...');

  const notes = [
    'Discussed project milestones and deadlines. Team agreed on new timeline.',
    'Reviewed product roadmap for Q1. Prioritized features based on customer feedback.',
    'Engineering sync: resolved blockers, assigned new tasks for sprint.',
    'Design review completed. Minor revisions needed for mobile layout.',
    'Budget approved with 10% increase for marketing initiatives.',
    'Daily standup: all tasks on track, no blockers reported.',
    'Client presentation went well. Follow-up meeting scheduled.',
    'Retrospective: identified process improvements for next sprint.',
    'Investor call: positive feedback on growth metrics.',
    'Architecture review: decided on microservices approach.',
    'Marketing strategy: focus on content marketing and SEO.',
    'HR policies updated: new remote work guidelines approved.',
    'Customer success: NPS improved by 15 points this quarter.',
    'All hands: announced new product launch date.',
    'Security audit: no critical vulnerabilities found.',
    'Partnership discussion: MOU to be drafted by next week.'
  ];

  for (let i = 0; i < notes.length; i++) {
    await prisma.meetingNote.create({
      data: {
        content: notes[i],
        type: i % 3 === 0 ? 'ai_generated' : 'manual',
        meetingId: meetings[i % meetings.length].id,
        authorId: demoUser.id
      }
    });
  }

  console.log('🎙️ Creating transcripts (15+ items)...');

  const transcriptContent = `Meeting Transcript

[00:00] Host: Good morning everyone, let's get started with today's meeting.
[00:15] Participant 1: Thanks for organizing this. I have some updates to share.
[00:30] Host: Great, please go ahead.
[00:45] Participant 1: We've completed the initial phase of the project and are now moving to testing.
[01:00] Participant 2: That's excellent progress. What's the timeline for the testing phase?
[01:15] Participant 1: We expect testing to take about two weeks.
[01:30] Host: Perfect. Let's discuss the next steps and action items.
[02:00] Participant 3: I'd like to suggest we add more automated tests.
[02:15] Host: Good point. Let's make that an action item.
[02:30] All: Agreed.
[03:00] Host: Any other topics to discuss?
[03:15] Participant 2: I wanted to mention the upcoming client presentation.
[03:30] Host: Yes, let's prepare for that. Meeting adjourned.`;

  for (let i = 0; i < 15; i++) {
    if (i < meetings.length) {
      await prisma.transcript.create({
        data: {
          content: transcriptContent,
          language: 'en',
          duration: Math.floor(Math.random() * 3600) + 1800,
          meetingId: meetings[i].id
        }
      });
    }
  }

  console.log('📋 Creating agenda items (15+ items)...');

  const agendaTemplates = [
    ['Introduction', 'Team Updates', 'Project Status', 'Open Discussion', 'Next Steps'],
    ['Welcome', 'Review Action Items', 'Main Topic', 'Q&A', 'Wrap Up'],
    ['Check-in', 'Sprint Review', 'Demo', 'Retrospective', 'Planning'],
    ['Opening Remarks', 'Financial Review', 'Strategic Initiatives', 'Resource Planning', 'Closing']
  ];

  for (let i = 0; i < meetings.length; i++) {
    const template = agendaTemplates[i % agendaTemplates.length];
    for (let j = 0; j < template.length; j++) {
      await prisma.agendaItem.create({
        data: {
          title: template[j],
          description: `Discussion point for ${template[j].toLowerCase()}`,
          duration: [5, 10, 15, 20, 30][Math.floor(Math.random() * 5)],
          order: j + 1,
          status: meetings[i].status === 'completed' ? 'completed' : 'pending',
          meetingId: meetings[i].id
        }
      });
    }
  }

  console.log('🔨 Creating decisions (15+ items)...');

  const decisions = [
    { title: 'Adopt new CI/CD pipeline', description: 'Team decided to switch to GitHub Actions', status: 'approved', madeBy: 'Engineering Team' },
    { title: 'Increase marketing budget', description: 'Budget increased by 15% for Q1', status: 'approved', madeBy: 'Leadership' },
    { title: 'Hire two senior developers', description: 'Approved hiring for backend and frontend roles', status: 'approved', madeBy: 'HR' },
    { title: 'Delay feature launch', description: 'Feature launch postponed by 2 weeks', status: 'approved', madeBy: 'Product Team' },
    { title: 'New vendor selection', description: 'Selected CloudVendor for hosting', status: 'approved', madeBy: 'IT' },
    { title: 'Remote work policy update', description: 'Approved 3 days WFH per week', status: 'approved', madeBy: 'HR' },
    { title: 'Customer pricing change', description: 'Pricing proposal under review', status: 'proposed', madeBy: 'Sales' },
    { title: 'Office expansion', description: 'Deferred to Q2 for budget review', status: 'deferred', madeBy: 'Operations' },
    { title: 'New partnership', description: 'Partnership with XYZ approved', status: 'approved', madeBy: 'Business Dev' },
    { title: 'Training program', description: 'Annual training budget approved', status: 'approved', madeBy: 'Learning & Dev' },
    { title: 'Security tool purchase', description: 'New security tools procurement approved', status: 'approved', madeBy: 'Security Team' },
    { title: 'API versioning strategy', description: 'Decided on semantic versioning', status: 'approved', madeBy: 'Engineering' },
    { title: 'Customer support hours', description: 'Extended support hours rejected', status: 'rejected', madeBy: 'Support Team' },
    { title: 'Mobile app development', description: 'iOS app development approved', status: 'approved', madeBy: 'Product' },
    { title: 'Data retention policy', description: '7-year retention policy approved', status: 'approved', madeBy: 'Compliance' },
    { title: 'Team restructuring', description: 'Proposal under consideration', status: 'proposed', madeBy: 'Management' }
  ];

  for (let i = 0; i < decisions.length; i++) {
    await prisma.decision.create({
      data: {
        ...decisions[i],
        meetingId: meetings[i % meetings.length].id
      }
    });
  }

  console.log('📌 Creating follow-ups (15+ items)...');

  const followUps = [
    { title: 'Send meeting summary', assignee: 'Demo User', status: 'completed' },
    { title: 'Schedule follow-up call', assignee: 'John Smith', status: 'pending' },
    { title: 'Share presentation deck', assignee: 'Sarah Johnson', status: 'completed' },
    { title: 'Update project tracker', assignee: 'Mike Wilson', status: 'in_progress' },
    { title: 'Send proposal document', assignee: 'Demo User', status: 'pending' },
    { title: 'Review contract terms', assignee: 'Legal Team', status: 'pending' },
    { title: 'Collect team feedback', assignee: 'HR', status: 'in_progress' },
    { title: 'Prepare demo environment', assignee: 'Engineering', status: 'pending' },
    { title: 'Update roadmap', assignee: 'Product', status: 'completed' },
    { title: 'Send invoice', assignee: 'Finance', status: 'completed' },
    { title: 'Book meeting room', assignee: 'Admin', status: 'completed' },
    { title: 'Create ticket for bug', assignee: 'QA Team', status: 'completed' },
    { title: 'Draft press release', assignee: 'Marketing', status: 'pending' },
    { title: 'Update CRM records', assignee: 'Sales', status: 'in_progress' },
    { title: 'Schedule training session', assignee: 'L&D', status: 'pending' },
    { title: 'Review analytics report', assignee: 'Data Team', status: 'pending' }
  ];

  for (let i = 0; i < followUps.length; i++) {
    await prisma.followUp.create({
      data: {
        ...followUps[i],
        description: `Follow-up task: ${followUps[i].title}`,
        dueDate: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000),
        meetingId: meetings[i % meetings.length].id
      }
    });
  }

  console.log('🧠 Creating AI insights (15+ items)...');

  const insights = [
    { type: 'summary', content: 'Meeting focused on Q4 planning with emphasis on resource allocation and timeline adjustments.', confidence: 0.92 },
    { type: 'sentiment', content: '{"overall": "positive", "score": 78, "highlights": ["Team morale high", "Good progress reported"]}', confidence: 0.85 },
    { type: 'key_topics', content: '[{"topic": "Budget", "importance": 9}, {"topic": "Timeline", "importance": 8}, {"topic": "Resources", "importance": 7}]', confidence: 0.88 },
    { type: 'action_suggestion', content: 'Consider scheduling weekly check-ins to maintain momentum on project deliverables.', confidence: 0.75 },
    { type: 'risk_alert', content: 'Timeline risk detected: Multiple dependencies on external vendor deliverables.', confidence: 0.82 },
    { type: 'summary', content: 'Product review identified 3 key features for immediate development and 5 for backlog.', confidence: 0.90 },
    { type: 'sentiment', content: '{"overall": "neutral", "score": 55, "highlights": ["Concerns about deadline", "Positive about team capability"]}', confidence: 0.80 },
    { type: 'key_topics', content: '[{"topic": "Features", "importance": 10}, {"topic": "User Feedback", "importance": 8}, {"topic": "Competition", "importance": 6}]', confidence: 0.87 },
    { type: 'action_suggestion', content: 'Recommend conducting user research before finalizing feature specifications.', confidence: 0.78 },
    { type: 'risk_alert', content: 'Resource constraint: Current team capacity may not support all planned features.', confidence: 0.85 },
    { type: 'summary', content: 'Engineering sync resolved 2 blockers and identified 1 new technical challenge.', confidence: 0.91 },
    { type: 'sentiment', content: '{"overall": "positive", "score": 72, "highlights": ["Blockers resolved quickly", "Team collaboration strong"]}', confidence: 0.83 },
    { type: 'key_topics', content: '[{"topic": "Technical Debt", "importance": 8}, {"topic": "Sprint Goals", "importance": 9}, {"topic": "Architecture", "importance": 7}]', confidence: 0.86 },
    { type: 'action_suggestion', content: 'Schedule dedicated time for technical debt reduction in next sprint.', confidence: 0.77 },
    { type: 'risk_alert', content: 'Integration risk: Third-party API changes may impact delivery timeline.', confidence: 0.80 },
    { type: 'summary', content: 'Design review approved homepage redesign with minor revisions to mobile layout.', confidence: 0.93 }
  ];

  for (let i = 0; i < insights.length; i++) {
    await prisma.aIInsight.create({
      data: {
        ...insights[i],
        meetingId: meetings[i % meetings.length].id,
        userId: demoUser.id
      }
    });
  }

  console.log('📅 Creating calendar events (15+ items)...');

  const calendarEvents = [
    { title: 'Team Standup', recurrence: 'daily', isAllDay: false },
    { title: 'Sprint Planning', recurrence: 'weekly', isAllDay: false },
    { title: 'Company Holiday', recurrence: 'none', isAllDay: true },
    { title: '1:1 with Manager', recurrence: 'weekly', isAllDay: false },
    { title: 'Product Demo', recurrence: 'none', isAllDay: false },
    { title: 'Training Session', recurrence: 'none', isAllDay: false },
    { title: 'Quarterly Review', recurrence: 'none', isAllDay: false },
    { title: 'Team Lunch', recurrence: 'monthly', isAllDay: false },
    { title: 'Board Meeting', recurrence: 'monthly', isAllDay: false },
    { title: 'Customer Call', recurrence: 'none', isAllDay: false },
    { title: 'Code Review Session', recurrence: 'weekly', isAllDay: false },
    { title: 'Marketing Sync', recurrence: 'weekly', isAllDay: false },
    { title: 'Sales Pipeline Review', recurrence: 'weekly', isAllDay: false },
    { title: 'Infrastructure Planning', recurrence: 'none', isAllDay: false },
    { title: 'Security Training', recurrence: 'none', isAllDay: false },
    { title: 'Annual Planning Offsite', recurrence: 'none', isAllDay: true }
  ];

  for (let i = 0; i < calendarEvents.length; i++) {
    const event = calendarEvents[i];
    const startTime = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    startTime.setHours(9 + (i % 8), 0, 0, 0);
    const endTime = new Date(startTime.getTime() + (event.isAllDay ? 24 : 1) * 60 * 60 * 1000);

    await prisma.calendarEvent.create({
      data: {
        title: event.title,
        description: `${event.title} - scheduled event`,
        startTime,
        endTime,
        isAllDay: event.isAllDay,
        recurrence: event.recurrence,
        location: i % 2 === 0 ? 'Conference Room A' : 'Virtual',
        reminders: { '15min': true, '1hour': true }
      }
    });
  }

  console.log('📋 Creating meeting templates (15+ items)...');

  const templates = [
    { name: 'Daily Standup', description: 'Quick daily sync meeting', duration: 15, agendaItems: [{ title: 'Yesterday', duration: 5 }, { title: 'Today', duration: 5 }, { title: 'Blockers', duration: 5 }] },
    { name: 'Sprint Planning', description: 'Bi-weekly sprint planning session', duration: 120, agendaItems: [{ title: 'Review Backlog', duration: 30 }, { title: 'Estimation', duration: 45 }, { title: 'Commitment', duration: 30 }] },
    { name: 'Sprint Retrospective', description: 'End of sprint retrospective', duration: 60, agendaItems: [{ title: 'What went well', duration: 15 }, { title: 'What to improve', duration: 20 }, { title: 'Action items', duration: 15 }] },
    { name: '1:1 Meeting', description: 'One-on-one meeting with direct report', duration: 30, agendaItems: [{ title: 'Updates', duration: 10 }, { title: 'Challenges', duration: 10 }, { title: 'Goals', duration: 10 }] },
    { name: 'Client Presentation', description: 'Client-facing presentation template', duration: 60, agendaItems: [{ title: 'Introduction', duration: 5 }, { title: 'Demo', duration: 30 }, { title: 'Q&A', duration: 20 }] },
    { name: 'Design Review', description: 'Design critique and feedback session', duration: 45, agendaItems: [{ title: 'Present designs', duration: 15 }, { title: 'Feedback', duration: 20 }, { title: 'Next steps', duration: 10 }] },
    { name: 'All Hands', description: 'Company-wide meeting template', duration: 60, agendaItems: [{ title: 'Company updates', duration: 20 }, { title: 'Team highlights', duration: 25 }, { title: 'Q&A', duration: 15 }] },
    { name: 'Interview - Technical', description: 'Technical interview template', duration: 60, agendaItems: [{ title: 'Introduction', duration: 5 }, { title: 'Coding exercise', duration: 35 }, { title: 'Q&A', duration: 15 }] },
    { name: 'Project Kickoff', description: 'New project kickoff meeting', duration: 90, agendaItems: [{ title: 'Project overview', duration: 20 }, { title: 'Roles & responsibilities', duration: 20 }, { title: 'Timeline', duration: 25 }, { title: 'Questions', duration: 15 }] },
    { name: 'Budget Review', description: 'Financial review meeting', duration: 60, agendaItems: [{ title: 'Current status', duration: 15 }, { title: 'Projections', duration: 20 }, { title: 'Requests', duration: 15 }] },
    { name: 'Product Review', description: 'Product feature review session', duration: 45, agendaItems: [{ title: 'Feature demo', duration: 15 }, { title: 'Metrics review', duration: 15 }, { title: 'Roadmap update', duration: 15 }] },
    { name: 'Training Session', description: 'Team training template', duration: 90, agendaItems: [{ title: 'Overview', duration: 10 }, { title: 'Training content', duration: 60 }, { title: 'Practice', duration: 15 }] },
    { name: 'Customer Feedback', description: 'Customer feedback review', duration: 45, agendaItems: [{ title: 'Feedback summary', duration: 15 }, { title: 'Discussion', duration: 20 }, { title: 'Action items', duration: 10 }] },
    { name: 'Incident Post-Mortem', description: 'Post-incident analysis meeting', duration: 60, agendaItems: [{ title: 'Timeline', duration: 15 }, { title: 'Root cause', duration: 20 }, { title: 'Prevention', duration: 15 }] },
    { name: 'Strategy Session', description: 'Strategic planning meeting', duration: 120, agendaItems: [{ title: 'Current state', duration: 20 }, { title: 'Goals', duration: 30 }, { title: 'Strategies', duration: 40 }, { title: 'Action plan', duration: 20 }] },
    { name: 'Team Building', description: 'Team bonding activity meeting', duration: 60, agendaItems: [{ title: 'Icebreaker', duration: 10 }, { title: 'Activity', duration: 40 }, { title: 'Wrap up', duration: 10 }] }
  ];

  for (const template of templates) {
    await prisma.meetingTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        duration: template.duration,
        agendaItems: template.agendaItems,
        isPublic: true
      }
    });
  }

  console.log('🔗 Creating integrations (15+ items)...');

  const integrations = [
    { name: 'google_calendar', type: 'calendar', status: 'connected' },
    { name: 'outlook', type: 'calendar', status: 'disconnected' },
    { name: 'zoom', type: 'video', status: 'connected' },
    { name: 'teams', type: 'video', status: 'disconnected' },
    { name: 'google_meet', type: 'video', status: 'connected' },
    { name: 'slack', type: 'messaging', status: 'connected' },
    { name: 'discord', type: 'messaging', status: 'disconnected' },
    { name: 'notion', type: 'documentation', status: 'connected' },
    { name: 'confluence', type: 'documentation', status: 'disconnected' },
    { name: 'jira', type: 'project_management', status: 'connected' },
    { name: 'asana', type: 'project_management', status: 'disconnected' },
    { name: 'trello', type: 'project_management', status: 'disconnected' },
    { name: 'salesforce', type: 'crm', status: 'connected' },
    { name: 'hubspot', type: 'crm', status: 'disconnected' },
    { name: 'github', type: 'development', status: 'connected' },
    { name: 'gitlab', type: 'development', status: 'disconnected' }
  ];

  for (const integration of integrations) {
    await prisma.integration.create({
      data: {
        name: integration.name,
        type: integration.type,
        status: integration.status,
        config: integration.status === 'connected' ? { enabled: true, lastSync: new Date().toISOString() } : Prisma.DbNull
      }
    });
  }

  console.log('🔔 Creating notifications (15+ items)...');

  const notifications = [
    { title: 'Meeting Reminder', message: 'Q4 Planning Session starts in 15 minutes', type: 'meeting_reminder', status: 'unread' },
    { title: 'Action Item Due', message: 'Review code PR #123 is due today', type: 'action_item', status: 'unread' },
    { title: 'Follow-up Required', message: 'Send meeting summary for Engineering Sync', type: 'follow_up', status: 'read' },
    { title: 'New Meeting Invite', message: 'You have been invited to Client Presentation', type: 'meeting_reminder', status: 'unread' },
    { title: 'Task Completed', message: 'Schedule client meeting has been marked as complete', type: 'action_item', status: 'read' },
    { title: 'Meeting Cancelled', message: 'HR Policy Review has been cancelled', type: 'system', status: 'read' },
    { title: 'AI Summary Ready', message: 'AI summary is ready for Product Review Meeting', type: 'system', status: 'unread' },
    { title: 'Integration Connected', message: 'Slack integration has been successfully connected', type: 'system', status: 'read' },
    { title: 'Upcoming Meeting', message: 'Sprint Retrospective starts tomorrow at 10 AM', type: 'meeting_reminder', status: 'unread' },
    { title: 'Action Item Overdue', message: 'Update project timeline is 2 days overdue', type: 'action_item', status: 'unread' },
    { title: 'New Decision', message: 'A new decision has been recorded in Q4 Planning', type: 'system', status: 'read' },
    { title: 'Meeting Recording', message: 'Recording is now available for Engineering Sync', type: 'system', status: 'unread' },
    { title: 'Weekly Summary', message: 'Your weekly meeting summary is ready', type: 'system', status: 'unread' },
    { title: 'Follow-up Complete', message: 'Share presentation deck has been completed', type: 'follow_up', status: 'read' },
    { title: 'Calendar Synced', message: 'Google Calendar sync completed successfully', type: 'system', status: 'read' },
    { title: 'New Insight', message: 'AI detected a potential risk in recent meeting', type: 'system', status: 'unread' }
  ];

  for (const notification of notifications) {
    await prisma.notification.create({
      data: {
        ...notification,
        userId: demoUser.id
      }
    });
  }

  console.log('📊 Creating analytics (15+ items)...');

  const periods = ['daily', 'weekly', 'monthly'];
  for (let i = 0; i < 16; i++) {
    await prisma.analytics.create({
      data: {
        period: periods[i % 3],
        meetingsCount: Math.floor(Math.random() * 20) + 5,
        avgDuration: Math.floor(Math.random() * 30) + 30,
        actionItemsRate: Math.random() * 0.5 + 0.5,
        attendanceRate: Math.random() * 0.3 + 0.7,
        data: {
          topTopics: ['Project Updates', 'Planning', 'Reviews'],
          sentimentTrend: ['positive', 'neutral', 'positive'],
          productivityScore: Math.floor(Math.random() * 30) + 70
        }
      }
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📧 Demo Credentials:');
  console.log('   Email: demo@aimeetingagent.com');
  console.log('   Password: demo123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
