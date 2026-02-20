# Deployment Checklist

## Pre-Deployment

### 1. Database Migration ✅
- [ ] Run migration: `npx supabase db push`
- [ ] Verify tables created:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('agent_executions', 'agent_tools', 'agent_mcp_servers', 'execution_logs');
  ```
- [ ] Verify RLS policies enabled
- [ ] Test helper functions work

### 2. Environment Variables ✅
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` is set
- [ ] Supabase credentials are correct
- [ ] All required env vars in `.env.local`

### 3. Dependencies ✅
- [ ] All packages installed: `npm install`
- [ ] No TypeScript errors: `npm run build`
- [ ] Tests pass (if any)

## Testing

### 4. Basic Execution Test
- [ ] Create test agent via builder
- [ ] Agent has `instruction_prompt` saved
- [ ] Execute via API:
  ```bash
  curl -X POST http://localhost:3000/api/agents/{id}/execute \
    -H "Content-Type: application/json" \
    -d '{"input": {"message": "Hello"}}'
  ```
- [ ] Execution completes successfully
- [ ] Results returned correctly
- [ ] Execution record in database

### 5. Tool Testing
- [ ] Test `web_scrape` tool
- [ ] Test `ai_process` tool
- [ ] Test `read` tool
- [ ] Test `write` tool
- [ ] Tool calls logged in database

### 6. Parallel Execution Test
- [ ] Run same agent 3 times simultaneously
- [ ] All executions complete
- [ ] No data mixing
- [ ] Each has unique session_id

### 7. Error Handling Test
- [ ] Test with invalid input
- [ ] Test with non-existent agent
- [ ] Test with disabled tools
- [ ] Errors logged correctly
- [ ] User sees friendly error messages

## UI Integration

### 8. Execution Panel
- [ ] Integrate `ExecutionPanel` into agent builder
- [ ] Input form works
- [ ] Execute button works
- [ ] Results display correctly
- [ ] Logs show up

### 9. Auto-Generation
- [ ] Instruction prompts auto-generated on save
- [ ] Tool config extracted from workflow
- [ ] Execution context populated
- [ ] Agent tools synced

## Performance

### 10. Load Testing
- [ ] Test with 10 concurrent executions
- [ ] Test with large input data
- [ ] Test with long-running executions
- [ ] Monitor database performance
- [ ] Check for memory leaks

### 11. Optimization
- [ ] Database indexes working
- [ ] Query performance acceptable
- [ ] API response times < 5s
- [ ] Streaming works smoothly

## Security

### 12. Authentication
- [ ] Only authenticated users can execute
- [ ] Users can only execute their own agents
- [ ] RLS policies enforced
- [ ] No data leakage between users

### 13. Tool Security
- [ ] Tools can't access unauthorized data
- [ ] Web scraping respects rate limits
- [ ] No code injection vulnerabilities
- [ ] Input validation working

## Documentation

### 14. Code Documentation
- [ ] All functions have JSDoc comments
- [ ] Types are well-defined
- [ ] README files updated
- [ ] API documentation complete

### 15. User Documentation
- [ ] Setup instructions clear
- [ ] Example agents provided
- [ ] Troubleshooting guide complete
- [ ] FAQ updated

## Deployment

### 16. Production Environment
- [ ] Environment variables set in production
- [ ] Database migration run in production
- [ ] SSL/TLS configured
- [ ] CORS configured correctly

### 17. Monitoring
- [ ] Error logging configured
- [ ] Performance monitoring set up
- [ ] Execution metrics tracked
- [ ] Alerts configured

### 18. Backup
- [ ] Database backup configured
- [ ] Execution logs backed up
- [ ] Rollback plan documented

## Post-Deployment

### 19. Smoke Tests
- [ ] Create agent in production
- [ ] Execute agent in production
- [ ] Verify results correct
- [ ] Check logs for errors

### 20. User Testing
- [ ] Test with real users
- [ ] Gather feedback
- [ ] Monitor for issues
- [ ] Iterate based on feedback

## Rollback Plan

If something goes wrong:

1. **Database Issues**
   ```sql
   -- Rollback migration
   DROP TABLE IF EXISTS execution_logs;
   DROP TABLE IF EXISTS agent_mcp_servers;
   DROP TABLE IF EXISTS agent_tools;
   DROP TABLE IF EXISTS agent_executions;
   
   -- Remove added columns
   ALTER TABLE agents DROP COLUMN IF EXISTS instruction_prompt;
   ALTER TABLE agents DROP COLUMN IF EXISTS tool_config;
   ALTER TABLE agents DROP COLUMN IF EXISTS execution_context;
   ALTER TABLE agents DROP COLUMN IF EXISTS mcp_servers;
   ```

2. **Code Issues**
   ```bash
   # Revert to previous commit
   git revert HEAD
   git push
   ```

3. **API Issues**
   - Disable execution endpoint
   - Show maintenance message
   - Fix issues
   - Re-enable

## Success Criteria

- ✅ All tests passing
- ✅ No errors in logs
- ✅ Users can create and execute agents
- ✅ Execution time < 30 seconds
- ✅ 99% success rate
- ✅ No security vulnerabilities

## Sign-Off

- [ ] Developer tested
- [ ] QA approved
- [ ] Security reviewed
- [ ] Documentation complete
- [ ] Ready for production

---

**Date**: _____________
**Deployed by**: _____________
**Version**: _____________
