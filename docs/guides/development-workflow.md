# Development Workflow Guide

## Overview

WealthLog follows a Git Flow inspired branching strategy with automated deployments through Vercel (frontend) and Render (backend).

## Branch Structure

```
main (production)
  └── staging (pre-production)
       └── feature/your-feature (development)
       └── bugfix/issue-description (bug fixes)
       └── hotfix/critical-fix (urgent production fixes)
```

### Branch Purposes

- **main**: Production-ready code, automatically deployed
- **staging**: Integration branch for testing features together
- **feature/**: New features and enhancements
- **bugfix/**: Non-critical bug fixes
- **hotfix/**: Critical production fixes

## Development Process

### 1. Starting a New Feature

```bash
# Always start from staging
git checkout staging
git pull origin staging

# Create feature branch
git checkout -b feature/user-authentication

# Verify branch
git branch
```

### 2. Development Cycle

```bash
# Start development servers
./scripts/maintain.sh dev

# Make your changes
# ... edit files ...

# Run tests frequently
./scripts/maintain.sh test

# Check status
./scripts/maintain.sh status
```

### 3. Committing Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Stage changes
git add .

# Commit with conventional message
git commit -m "feat: add user authentication"
```

#### Commit Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons)
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Maintenance tasks
- `perf:` Performance improvements
- `ci:` CI/CD changes

#### Examples

```bash
git commit -m "feat: add OAuth Google login"
git commit -m "fix: resolve dashboard data loading issue"
git commit -m "docs: update API documentation"
git commit -m "refactor: simplify authentication middleware"
git commit -m "test: add unit tests for user service"
```

### 4. Pre-Push Checklist

Before pushing your branch:

```bash
# 1. Run comprehensive tests
./scripts/maintain.sh test

# 2. Check for issues
./scripts/maintain.sh doctor

# 3. Validate deployment readiness
./scripts/maintain.sh deploy:check

# 4. Fix any issues
./scripts/maintain.sh fix
```

### 5. Push and Create Pull Request

```bash
# Push your feature branch
git push origin feature/user-authentication

# Go to GitHub and create a Pull Request to 'staging'
```

#### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Tested on mobile

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] No console.logs left
- [ ] Environment variables documented
```

### 6. Code Review Process

#### For Reviewers

1. Check out the branch locally:
```bash
git fetch origin
git checkout feature/user-authentication
./scripts/maintain.sh dev
```

2. Test the feature thoroughly
3. Review code for:
   - Security issues
   - Performance concerns
   - Code style consistency
   - Test coverage

#### For Authors

- Respond to all comments
- Make requested changes
- Re-request review after changes
- Keep PR updated with staging

### 7. Merging to Staging

After approval:

1. PR is merged to `staging` by reviewer
2. Staging environment automatically deploys
3. Team tests on staging environment
4. If issues found, create `bugfix/` branch

### 8. Deploying to Production

Once staging is stable:

```bash
# Create PR from staging to main
# This is typically done by team lead/senior dev

# After merge, production automatically deploys
```

## Working with Issues

### Creating Issues

Use GitHub Issues with labels:
- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high/medium/low` - Priority levels

### Linking PRs to Issues

In your PR description or commit message:
```bash
git commit -m "fix: resolve login issue (#123)"
```

This automatically links and closes issue #123 when merged.

## Hotfix Process

For critical production issues:

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# 2. Make minimal fix
# ... fix the issue ...

# 3. Test thoroughly
./scripts/maintain.sh test
./scripts/maintain.sh auth:test prod

# 4. Push and create PR to main
git push origin hotfix/critical-security-fix

# 5. After merge to main, also merge to staging
git checkout staging
git merge main
git push origin staging
```

## Database Migrations

When changing database schema:

```bash
# 1. Modify schema
cd wealthlogs-code/apps/backend
# Edit prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_user_preferences

# 3. Test migration
./scripts/maintain.sh db:migrate

# 4. Commit schema and migration files
git add prisma/
git commit -m "feat: add user preferences table"
```

## Environment Variables

### Adding New Environment Variables

1. Add to local `.env`:
```bash
./scripts/maintain.sh config edit
```

2. Document in PR:
```markdown
## New Environment Variables
- `NEW_API_KEY`: API key for external service (required)
  - Get from: https://service.com/api
  - Add to Vercel/Render settings
```

3. Update production before deploying:
   - Add to Vercel dashboard for frontend
   - Add to Render dashboard for backend

## Testing Strategy

### Before Every Commit

```bash
# Quick test
./scripts/maintain.sh test
```

### Before Creating PR

```bash
# Comprehensive check
./scripts/maintain.sh deploy:check

# Test authentication
./scripts/maintain.sh auth:test

# Check logs for errors
./scripts/maintain.sh logs
```

### Testing Checklist

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Tested on different browsers
- [ ] Tested on mobile (if applicable)
- [ ] No console errors
- [ ] Performance acceptable

## Debugging Tips

### Check Logs

```bash
# View maintenance script logs
./scripts/maintain.sh logs

# View backend logs
./scripts/maintain.sh logs backend

# View frontend logs
./scripts/maintain.sh logs frontend
```

### Common Issues

#### Build Failures
```bash
./scripts/maintain.sh fix
./scripts/maintain.sh clean
./scripts/maintain.sh init
```

#### Database Issues
```bash
./scripts/maintain.sh db:studio  # Visual inspection
./scripts/maintain.sh db:migrate # Run migrations
```

#### Authentication Issues
```bash
./scripts/maintain.sh auth:test
./scripts/maintain.sh config validate
```

## Deployment

### Automatic Deployments

- **Frontend (Vercel)**: Deploys on push to `main`
- **Backend (Render)**: Deploys on push to `main`

### Manual Deployment Check

```bash
# Before pushing to main
./scripts/maintain.sh deploy:check

# After deployment
./scripts/maintain.sh deploy:status
./scripts/maintain.sh auth:test prod
```

### Rollback Process

If issues in production:

1. **Vercel**: Use Vercel dashboard to instant rollback
2. **Render**: Use Render dashboard to redeploy previous version
3. Create `hotfix/` branch to fix forward

## Best Practices

### Code Quality

1. **Follow TypeScript best practices**
2. **Use ESLint and Prettier**
3. **Write meaningful variable names**
4. **Add comments for complex logic**
5. **Keep functions small and focused**

### Security

1. **Never commit secrets**
2. **Use environment variables**
3. **Validate all inputs**
4. **Sanitize user data**
5. **Keep dependencies updated**

### Performance

1. **Optimize images**
2. **Use lazy loading**
3. **Implement caching**
4. **Monitor bundle size**
5. **Use database indexes**

### Documentation

1. **Update README for new features**
2. **Document API changes**
3. **Add JSDoc comments**
4. **Update environment variables list**
5. **Keep changelog updated**

## Team Collaboration

### Daily Workflow

```bash
# Morning: Pull latest changes
git checkout staging
git pull origin staging
git checkout feature/your-feature
git merge staging

# During day: Regular commits
git add .
git commit -m "feat: implement feature part"

# End of day: Push changes
git push origin feature/your-feature
```

### Communication

- **Slack/Discord**: Quick questions and updates
- **GitHub Issues**: Feature requests and bugs
- **Pull Requests**: Code discussions
- **Documentation**: Long-term knowledge

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# WealthLog shortcuts
alias wl="cd ~/path/to/wealthlogs"
alias wldev="./scripts/maintain.sh dev"
alias wltest="./scripts/maintain.sh test"
alias wlcheck="./scripts/maintain.sh deploy:check"
alias wlfix="./scripts/maintain.sh fix"
alias wlstatus="./scripts/maintain.sh status"
```

---

Happy coding! 🚀
